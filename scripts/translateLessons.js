const fs = require('fs');
const path = require('path');

// Configuration
const ORIGINAL_LESSONS_DIR = '../lessons';
const SPANISH_LESSONS_DIR = '../lessons/spanish';

// Translation mapping for common terms
const translationMap = {
  'Allah': 'Allah',
  'Quran': 'Corán',
  'Hadith': 'hadiz',
  'Sunnah': 'Sunnah',
  'Iman': 'Iman',
  'Tawhid': 'Tawhid',
  'Shirk': 'shirk',
  'Du\'a': 'du\'a',
  'Salah': 'salah',
  'Masjid': 'mezquita',
  'Ummah': 'umma',
  'Prophet': 'Profeta',
  'Messenger': 'Mensajero',
  'Angels': 'Ángeles',
  'Divine': 'Divino',
  'Books': 'Libros',
  'Faith': 'Fe',
  'Belief': 'Creencia',
  'Worship': 'Adoración',
  'Prayer': 'Oración',
  'Mercy': 'Misericordia',
  'Justice': 'Justicia',
  'Wisdom': 'Sabiduría',
  'Guidance': 'Guía',
  'Revelation': 'Revelación',
  'Scripture': 'Escritura',
  'Law': 'Ley',
  'Commandment': 'Mandamiento',
  'Virtue': 'Virtud',
  'Sin': 'Pecado',
  'Forgiveness': 'Perdón',
  'Repentance': 'Arrepentimiento',
  'Paradise': 'Paraíso',
  'Hell': 'Infierno',
  'Judgment': 'Juicio',
  'Resurrection': 'Resurrección',
  'Eternity': 'Eternidad',
  'Creation': 'Creación',
  'Creator': 'Creador',
  'Sustainer': 'Sustentador',
  'Protector': 'Protector',
  'Helper': 'Ayudante',
  'Guardian': 'Guardian',
  'Witness': 'Testigo',
  'Recorder': 'Escriba',
  'Questioner': 'Interrogador',
  'Punisher': 'Castigador',
  'Rewarder': 'Recompensador'
};

function translateText(text) {
  let translated = text;
  
  // Apply translation map
  Object.keys(translationMap).forEach(english => {
    const spanish = translationMap[english];
    const regex = new RegExp(`\\b${english}\\b`, 'gi');
    translated = translated.replace(regex, spanish);
  });
  
  return translated;
}

function translateLesson(lessonNumber) {
  const originalFile = path.join(ORIGINAL_LESSONS_DIR, `lesson-${String(lessonNumber).padStart(3, '0')}.json`);
  const spanishFile = path.join(SPANISH_LESSONS_DIR, `lesson-${String(lessonNumber).padStart(3, '0')}-es.json`);
  
  if (!fs.existsSync(originalFile)) {
    console.log(`❌ Original lesson ${lessonNumber} not found`);
    return;
  }
  
  if (fs.existsSync(spanishFile)) {
    console.log(`⚠️  Spanish lesson ${lessonNumber} already exists`);
    return;
  }
  
  try {
    const originalContent = fs.readFileSync(originalFile, 'utf8');
    const lesson = JSON.parse(originalContent);
    
    // Create Spanish version structure
    const spanishLesson = {
      id: lesson.id,
      title: translateText(lesson.title),
      introduction: translateText(lesson.introduction),
      sections: lesson.sections.map(section => ({
        heading: translateText(section.heading),
        content: translateText(section.content)
      })),
      conclusion: translateText(lesson.conclusion),
      references: lesson.references.map(ref => {
        // Translate Quran references
        if (ref.includes('Quran')) {
          return ref.replace('Quran', 'Corán');
        }
        return ref;
      })
    };
    
    // Write Spanish lesson
    fs.writeFileSync(spanishFile, JSON.stringify(spanishLesson, null, 2), 'utf8');
    console.log(`✅ Created Spanish lesson ${lessonNumber}`);
    
  } catch (error) {
    console.error(`❌ Error translating lesson ${lessonNumber}:`, error.message);
  }
}

function translateRange(start, end) {
  console.log(`🚀 Starting translation of lessons ${start}-${end}...`);
  
  for (let i = start; i <= end; i++) {
    translateLesson(i);
  }
  
  console.log('✨ Translation batch completed!');
}

// Usage examples:
// translateRange(6, 10);  // Translate lessons 6-10
// translateLesson(15);    // Translate single lesson 15

module.exports = {
  translateLesson,
  translateRange,
  translateText
};

// If running directly
if (require.main === module) {
  const args = process.argv.slice(2);
  
  if (args.length === 0) {
    console.log('Usage: node translateLessons.js <lesson-number>');
    console.log('   or: node translateLessons.js <start> <end>');
    console.log('Example: node translateLessons.js 6');
    console.log('Example: node translateLessons.js 6 10');
  } else if (args.length === 1) {
    translateLesson(parseInt(args[0]));
  } else if (args.length === 2) {
    translateRange(parseInt(args[0]), parseInt(args[1]));
  }
} 