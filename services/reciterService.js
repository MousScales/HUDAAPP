const STATIC_QURAN_API = 'https://staticquran.vercel.app/api/v1';

// Expanded list of reciters from the Static Quran API
export const availableReciters = [
  { id: '1', name: 'Abdul Basit Abd us-Samad' },
  { id: '2', name: 'Abdullah Ibn Ali Basfar' },
  { id: '3', name: 'Abdurrahman as-Sudais' },
  { id: '4', name: 'Abu Bakr ash-Shaatree' },
  { id: '5', name: 'Mishary Rashed Alafasy' },
  { id: '6', name: 'Saad al-Ghamdi' },
  { id: '7', name: 'Hani ar-Rifai' },
  { id: '8', name: 'Mahmoud Khalil al-Hussary' },
  { id: '9', name: 'Ali ibn Abdur-Rahman al-Hudhaify' },
  { id: '10', name: 'Maher al-Mu\'aiqly' },
  { id: '11', name: 'Mohamed Siddiq al-Minshawi' },
  { id: '12', name: 'Mohammad al-Tablaway' },
  { id: '13', name: 'Muhammad Ayyoub' },
  { id: '14', name: 'Muhammad Jibreel' },
  { id: '15', name: 'Saood bin Ibraaheem ash-Shuraym' },
  { id: '16', name: 'Salaah AbdulRahman Bukhatir' },
  { id: '17', name: 'Muhsin al-Qasim' },
  { id: '18', name: 'Abdullaah Awad al-Juhany' },
  { id: '19', name: 'Salah al-Budair' },
  { id: '20', name: 'Abdullah Matroud' },
  { id: '21', name: 'Muhammad Abdul Kareem' },
  { id: '22', name: 'Khalefa al-Tunaiji' },
  { id: '23', name: 'Mahmoud Ali al-Banna' },
  { id: '24', name: 'Khalid Abdullah al-Qahtanee' },
  { id: '25', name: 'Yasser Ad-Dosari' },
  { id: '26', name: 'Nasser al-Qatami' },
  { id: '27', name: 'Ali Hajjaj as-Suwaisy' },
  { id: '28', name: 'Sahl Yassin' },
  { id: '29', name: 'Ahmed ibn Ali al-Ajamy' },
  { id: '30', name: 'Aziz Alili' },
  { id: '31', name: 'Akram al-Alaqimy' },
  { id: '32', name: 'Fares Abbad' },
  { id: 'user', name: 'My Recitations' },
];

// Get audio URL for a specific ayah and reciter
export const getAyahAudioUrl = async (ayahNumber, reciter = '5', userRecordings = {}) => {
  // Handle user recordings
  if (reciter === 'user') {
    // Find the user recording for this ayah
    const recordingKey = Object.keys(userRecordings).find(key => {
      const [surahNumber, verseNumber] = key.split('_');
      return parseInt(verseNumber) === ayahNumber;
    });
    
    if (recordingKey && userRecordings[recordingKey]) {
      const recording = userRecordings[recordingKey];
      return recording.downloadURL || recording.localUri;
    }
    
    return null;
  }
  
  // Use the new Static Quran API for more reciters
  try {
    const response = await fetch(`${STATIC_QURAN_API}/ayah/${ayahNumber}?reciter=${reciter}`);
    const data = await response.json();
    
    if (data.success && data.data?.recitation?.audio) {
      return data.data.recitation.audio;
    }
  } catch (error) {
    console.log('Error fetching from Static Quran API, falling back to Islamic Network CDN');
  }
  
  // Fallback to Islamic Network CDN for compatibility
  return `https://cdn.islamic.network/quran/audio/128/${reciter}/${ayahNumber}.mp3`;
};

// Get reciter by ID
export const getReciterById = (id) => {
  return availableReciters.find(reciter => reciter.id === id);
};

// Get default reciter (Mishary Alafasy)
export const getDefaultReciter = () => {
  return getReciterById('5');
};

// Get all reciters except user recordings
export const getProfessionalReciters = () => {
  return availableReciters.filter(reciter => reciter.id !== 'user');
};
