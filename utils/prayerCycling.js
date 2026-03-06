import * as Location from 'expo-location';
import { t } from './translations';

// Prayer duration is based on when the next prayer starts
// Each prayer ends when the next prayer begins
const getPrayerEndTime = (currentPrayer, allPrayers) => {
  if (!currentPrayer || !allPrayers) return null;
  
  // Find the next prayer in the sequence
  const prayerOrder = ['fajr', 'sunrise', 'dhuhr', 'asr', 'maghrib', 'isha'];
  const currentIndex = prayerOrder.indexOf(currentPrayer.id);
  
  if (currentIndex === -1) return null;
  
  // Find the next prayer in the sequence
  let nextPrayer = null;
  
  // First, try to find the next prayer in today's prayers
  for (let i = currentIndex + 1; i < prayerOrder.length; i++) {
    const nextPrayerId = prayerOrder[i];
    nextPrayer = allPrayers.find(p => p.id === nextPrayerId);
    if (nextPrayer) break;
  }
  
  // If no next prayer found today, return null (will be handled by tomorrow's Fajr)
  return nextPrayer ? nextPrayer.dateObj : null;
};

// Format time to 12-hour format with single digit hours
const formatTime = (timeStr) => {
  let [h, m] = timeStr.split(":");
  h = parseInt(h, 10);
  m = parseInt(m, 10);
  
  const period = h >= 12 ? 'PM' : 'AM';
  const displayHour = h === 0 ? 12 : h > 12 ? h - 12 : h;
  const displayMinute = m.toString().padStart(2, '0');
  
  return `${displayHour}:${displayMinute} ${period}`;
};

// Get prayer times for tomorrow
const getTomorrowPrayerTimes = async (location, currentLanguage = 'english') => {
  try {
    if (!location?.coords) return null;
    
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    
    // Use the prayer service to get tomorrow's times
    const response = await fetch(
      `https://api.aladhan.com/v1/timings/${tomorrow.getTime() / 1000}?latitude=${location.coords.latitude}&longitude=${location.coords.longitude}&method=2`
    );
    
    if (!response.ok) return null;
    
    const data = await response.json();
    const timings = data.data.timings;
    
    // Create tomorrow's prayer times with proper structure
    const tomorrowPrayers = [
      {
        id: 'fajr',
        name: 'Fajr',
        time: formatTime(timings.Fajr),
        dateObj: new Date(tomorrow.getFullYear(), tomorrow.getMonth(), tomorrow.getDate(), 
          parseInt(timings.Fajr.split(':')[0]), parseInt(timings.Fajr.split(':')[1])),
        scene: { name: t('dawn', currentLanguage), colors: ['#1e3a8a', '#3b82f6'] }
      },
      {
        id: 'sunrise',
        name: 'Sunrise',
        time: formatTime(timings.Sunrise),
        dateObj: new Date(tomorrow.getFullYear(), tomorrow.getMonth(), tomorrow.getDate(), 
          parseInt(timings.Sunrise.split(':')[0]), parseInt(timings.Sunrise.split(':')[1])),
        scene: { name: t('sunrise', currentLanguage), colors: ['#ff6b35', '#f7931e'] }
      },
      {
        id: 'dhuhr',
        name: 'Dhuhr',
        time: formatTime(timings.Dhuhr),
        dateObj: new Date(tomorrow.getFullYear(), tomorrow.getMonth(), tomorrow.getDate(), 
          parseInt(timings.Dhuhr.split(':')[0]), parseInt(timings.Dhuhr.split(':')[1])),
        scene: { name: t('noon', currentLanguage), colors: ['#ffd700', '#ffa500'] }
      },
      {
        id: 'asr',
        name: 'Asr',
        time: formatTime(timings.Asr),
        dateObj: new Date(tomorrow.getFullYear(), tomorrow.getMonth(), tomorrow.getDate(), 
          parseInt(timings.Asr.split(':')[0]), parseInt(timings.Asr.split(':')[1])),
        scene: { name: t('afternoon', currentLanguage), colors: ['#ff8c00', '#ff6347'] }
      },
      {
        id: 'maghrib',
        name: 'Maghrib',
        time: formatTime(timings.Maghrib),
        dateObj: new Date(tomorrow.getFullYear(), tomorrow.getMonth(), tomorrow.getDate(), 
          parseInt(timings.Maghrib.split(':')[0]), parseInt(timings.Maghrib.split(':')[1])),
        scene: { name: t('sunset', currentLanguage), colors: ['#ff4500', '#dc143c'] }
      },
      {
        id: 'isha',
        name: 'Isha',
        time: formatTime(timings.Isha),
        dateObj: new Date(tomorrow.getFullYear(), tomorrow.getMonth(), tomorrow.getDate(), 
          parseInt(timings.Isha.split(':')[0]), parseInt(timings.Isha.split(':')[1])),
        scene: { name: t('night', currentLanguage), colors: ['#191970', '#1e1e3f', '#2a2a5a'] }
      }
    ];
    
    return tomorrowPrayers;
  } catch (error) {
    console.error('Error getting tomorrow prayer times:', error);
    return null;
  }
};

// Main prayer cycling function
export const updateCurrentAndNextPrayer = async (prayers, location = null, currentLanguage = 'english') => {
  const now = new Date();
  let current = null;
  let next = null;
  let active = false;

  // Filter out sunrise as it's not a prayer
  const prayerTimes = prayers.filter(prayer => prayer.id !== 'sunrise');

  // Check if a prayer time is currently active (between prayer start and next prayer start)
  for (let i = 0; i < prayerTimes.length; i++) {
    const prayerTime = prayerTimes[i].dateObj;
    if (prayerTime instanceof Date && !isNaN(prayerTime)) {
      const prayerEndTime = getPrayerEndTime(prayerTimes[i], prayers);
      
      // If there's a next prayer today, use that as the end time
      if (prayerEndTime && now >= prayerTime && now < prayerEndTime) {
        current = prayerTimes[i];
        active = true;
        break;
      }
      // If this is the last prayer of the day (Isha), check if we're within a reasonable window
      else if (!prayerEndTime && prayerTimes[i].id === 'isha' && now >= prayerTime) {
        // For Isha, consider it active for 2 hours after start time
        const ishaEndTime = new Date(prayerTime.getTime() + 2 * 60 * 60 * 1000); // 2 hours
        if (now < ishaEndTime) {
          current = prayerTimes[i];
          active = true;
          break;
        }
      }
    }
  }

  // If not in an active prayer window, find the last past prayer
  if (!active) {
    for (let i = prayerTimes.length - 1; i >= 0; i--) {
      const prayerTime = prayerTimes[i].dateObj;
      if (prayerTime instanceof Date && !isNaN(prayerTime)) {
        if (now > prayerTime) {
          current = prayerTimes[i];
          break;
        }
      }
    }
  }

  // Determine next prayer based on current time
  for (let i = 0; i < prayerTimes.length; i++) {
    const prayerTime = prayerTimes[i].dateObj;
    if (prayerTime instanceof Date && !isNaN(prayerTime)) {
      if (now < prayerTime) {
        next = prayerTimes[i];
        break;
      }
    }
  }

  // Handle after Isha - next is tomorrow's Fajr
  if (!next) {
    if (!active && prayerTimes.length > 0) {
      current = prayerTimes[prayerTimes.length - 1]; // Set current to Isha
    }
    
    // Get tomorrow's Fajr as next prayer
    if (location?.coords) {
      const tomorrowPrayers = await getTomorrowPrayerTimes(location, currentLanguage);
      if (tomorrowPrayers && tomorrowPrayers.length > 0) {
        // Find tomorrow's Fajr
        const tomorrowFajr = tomorrowPrayers.find(p => p.id === 'fajr');
        if (tomorrowFajr) {
          next = tomorrowFajr;
        }
      }
    }
  }

  // Fallback: if no current prayer found, set to last prayer of today
  if (!current && prayerTimes.length > 0) {
    current = prayerTimes[prayerTimes.length - 1];
  }

  return {
    current,
    next,
    active,
    prayerTimes: prayerTimes // Return filtered prayer times
  };
};

// Calculate time until next prayer
export const calculateTimeUntilNext = (nextPrayer) => {
  if (!nextPrayer?.dateObj) {
    return { hours: 0, minutes: 0, seconds: 0 };
  }

  const now = new Date();
  const timeDiff = nextPrayer.dateObj - now;
  
  if (timeDiff <= 0) {
    return { hours: 0, minutes: 0, seconds: 0 };
  }

  const hours = Math.floor(timeDiff / (1000 * 60 * 60));
  const minutes = Math.floor((timeDiff % (1000 * 60 * 60)) / (1000 * 60));
  const seconds = Math.floor((timeDiff % (1000 * 60)) / 1000);
  
  return { hours, minutes, seconds };
};

// Get prayer status for a specific prayer
export const getPrayerStatus = (prayerId, prayerData, dateKey) => {
  const todayData = prayerData[dateKey] || {};
  return {
    completed: todayData[prayerId] === true,
    excused: todayData[prayerId] === 'excused'
  };
};

// Check if prayer time has passed
export const isPrayerTimePassed = (prayer, allPrayers) => {
  if (!prayer?.dateObj) return false;
  
  const now = new Date();
  const prayerEndTime = getPrayerEndTime(prayer, allPrayers);
  
  // If there's a next prayer, use that as the end time
  if (prayerEndTime) {
    return now > prayerEndTime;
  }
  
  // If this is Isha (last prayer), consider it passed after 2 hours
  if (prayer.id === 'isha') {
    const ishaEndTime = new Date(prayer.dateObj.getTime() + 2 * 60 * 60 * 1000); // 2 hours
    return now > ishaEndTime;
  }
  
  return false;
};

// Check if prayer time is upcoming
export const isPrayerTimeUpcoming = (prayer) => {
  if (!prayer?.dateObj) return false;
  
  const now = new Date();
  return now < prayer.dateObj;
};

// Check if prayer time is current
export const isPrayerTimeCurrent = (prayer, allPrayers) => {
  if (!prayer?.dateObj) return false;
  
  const now = new Date();
  const prayerEndTime = getPrayerEndTime(prayer, allPrayers);
  
  // If there's a next prayer, use that as the end time
  if (prayerEndTime) {
    return now >= prayer.dateObj && now < prayerEndTime;
  }
  
  // If this is Isha (last prayer), consider it current for 2 hours
  if (prayer.id === 'isha') {
    const ishaEndTime = new Date(prayer.dateObj.getTime() + 2 * 60 * 60 * 1000); // 2 hours
    return now >= prayer.dateObj && now < ishaEndTime;
  }
  
  return false;
}; 