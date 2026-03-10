import { t } from '../utils/translations';

// Multilingual daily content service
class MultilingualDailyContentService {
  constructor() {
    this.quranVerses = {
      english: [
        {
          title: 'Seeking Help',
          arabic: 'وَاسْتَعِينُوا بِالصَّبْرِ وَالصَّلَاةِ',
          translation: 'And seek help through patience and prayer',
          reference: 'Quran 2:45'
        },
        {
          title: 'Allah\'s Mercy',
          arabic: 'إِنَّ اللَّهَ مَعَ الصَّابِرِينَ',
          translation: 'Indeed, Allah is with the patient',
          reference: 'Quran 2:153'
        },
        {
          title: 'Guidance',
          arabic: 'اهْدِنَا الصِّرَاطَ الْمُسْتَقِيمَ',
          translation: 'Guide us to the straight path',
          reference: 'Quran 1:6'
        }
      ],
      spanish: [
        {
          title: 'Buscando Ayuda',
          arabic: 'وَاسْتَعِينُوا بِالصَّبْرِ وَالصَّلَاةِ',
          translation: 'Y buscad ayuda a través de la paciencia y la oración',
          reference: 'Corán 2:45'
        },
        {
          title: 'Misericordia de Allah',
          arabic: 'إِنَّ اللَّهَ مَعَ الصَّابِرِينَ',
          translation: 'En verdad, Allah está con los pacientes',
          reference: 'Corán 2:153'
        },
        {
          title: 'Guía',
          arabic: 'اهْدِنَا الصِّرَاطَ الْمُسْتَقِيمَ',
          translation: 'Guíanos al camino recto',
          reference: 'Corán 1:6'
        }
      ],
      french: [
        {
          title: 'Chercher de l\'Aide',
          arabic: 'وَاسْتَعِينُوا بِالصَّبْرِ وَالصَّلَاةِ',
          translation: 'Et cherchez de l\'aide à travers la patience et la prière',
          reference: 'Coran 2:45'
        },
        {
          title: 'Miséricorde d\'Allah',
          arabic: 'إِنَّ اللَّهَ مَعَ الصَّابِرِينَ',
          translation: 'En vérité, Allah est avec les patients',
          reference: 'Coran 2:153'
        },
        {
          title: 'Guidance',
          arabic: 'اهْدِنَا الصِّرَاطَ الْمُسْتَقِيمَ',
          translation: 'Guide-nous vers le chemin droit',
          reference: 'Coran 1:6'
        }
      ],
      italian: [
        {
          title: 'Cercare Aiuto',
          arabic: 'وَاسْتَعِينُوا بِالصَّبْرِ وَالصَّلَاةِ',
          translation: 'E cercate aiuto attraverso la pazienza e la preghiera',
          reference: 'Corano 2:45'
        },
        {
          title: 'Misericordia di Allah',
          arabic: 'إِنَّ اللَّهَ مَعَ الصَّابِرِينَ',
          translation: 'In verità, Allah è con i pazienti',
          reference: 'Corano 2:153'
        },
        {
          title: 'Guida',
          arabic: 'اهْدِنَا الصِّرَاطَ الْمُسْتَقِيمَ',
          translation: 'Guidaci sul sentiero retto',
          reference: 'Corano 1:6'
        }
      ]
    };

    this.dailyDuas = {
      english: [
        {
          title: 'Morning Protection',
          arabic: 'أَصْبَحْنَا وَأَصْبَحَ الْمُلْكُ لِلَّهِ',
          translation: 'We have entered the morning and the dominion belongs to Allah',
          reference: 'Morning Adhkar'
        },
        {
          title: 'Evening Peace',
          arabic: 'أَمْسَيْنَا وَأَمْسَى الْمُلْكُ لِلَّهِ',
          translation: 'We have entered the evening and the dominion belongs to Allah',
          reference: 'Evening Adhkar'
        },
        {
          title: 'Before Eating',
          arabic: 'بِسْمِ اللَّهِ',
          translation: 'In the name of Allah',
          reference: 'Prophetic Tradition'
        },
        {
          title: 'Seeking Guidance',
          arabic: 'اللَّهُمَّ اهْدِنِي فِيمَنْ هَدَيْتَ',
          translation: 'O Allah, guide me among those You have guided',
          reference: 'Sunan at-Tirmidhi'
        }
      ],
      spanish: [
        {
          title: 'Protección Matutina',
          arabic: 'أَصْبَحْنَا وَأَصْبَحَ الْمُلْكُ لِلَّهِ',
          translation: 'Hemos entrado en la mañana y el dominio pertenece a Allah',
          reference: 'Adhkar Matutinos'
        },
        {
          title: 'Paz Vespertina',
          arabic: 'أَمْسَيْنَا وَأَمْسَى الْمُلْكُ لِلَّهِ',
          translation: 'Hemos entrado en la tarde y el dominio pertenece a Allah',
          reference: 'Adhkar Vespertinos'
        },
        {
          title: 'Antes de Comer',
          arabic: 'بِسْمِ اللَّهِ',
          translation: 'En el nombre de Allah',
          reference: 'Tradición Profética'
        },
        {
          title: 'Buscando Guía',
          arabic: 'اللَّهُمَّ اهْدِنِي فِيمَنْ هَدَيْتَ',
          translation: 'Oh Allah, guíame entre aquellos que has guiado',
          reference: 'Sunan at-Tirmidhi'
        }
      ],
      french: [
        {
          title: 'Protection Matinale',
          arabic: 'أَصْبَحْنَا وَأَصْبَحَ الْمُلْكُ لِلَّهِ',
          translation: 'Nous sommes entrés dans le matin et la domination appartient à Allah',
          reference: 'Adhkar du Matin'
        },
        {
          title: 'Paix du Soir',
          arabic: 'أَمْسَيْنَا وَأَمْسَى الْمُلْكُ لِلَّهِ',
          translation: 'Nous sommes entrés dans le soir et la domination appartient à Allah',
          reference: 'Adhkar du Soir'
        },
        {
          title: 'Avant de Manger',
          arabic: 'بِسْمِ اللَّهِ',
          translation: 'Au nom d\'Allah',
          reference: 'Tradition Prophétique'
        },
        {
          title: 'Chercher la Guidance',
          arabic: 'اللَّهُمَّ اهْدِنِي فِيمَنْ هَدَيْتَ',
          translation: 'Ô Allah, guide-moi parmi ceux que Tu as guidés',
          reference: 'Sunan at-Tirmidhi'
        }
      ],
      italian: [
        {
          title: 'Protezione Mattutina',
          arabic: 'أَصْبَحْنَا وَأَصْبَحَ الْمُلْكُ لِلَّهِ',
          translation: 'Siamo entrati nel mattino e il dominio appartiene ad Allah',
          reference: 'Adhkar del Mattino'
        },
        {
          title: 'Pace Serali',
          arabic: 'أَمْسَيْنَا وَأَمْسَى الْمُلْكُ لِلَّهِ',
          translation: 'Siamo entrati nella sera e il dominio appartiene ad Allah',
          reference: 'Adhkar Serali'
        },
        {
          title: 'Prima di Mangiare',
          arabic: 'بِسْمِ اللَّهِ',
          translation: 'Nel nome di Allah',
          reference: 'Tradizione Profetica'
        },
        {
          title: 'Cercare la Guida',
          arabic: 'اللَّهُمَّ اهْدِنِي فِيمَنْ هَدَيْتَ',
          translation: 'O Allah, guidami tra coloro che hai guidato',
          reference: 'Sunan at-Tirmidhi'
        }
      ]
    };

    this.dailyDhikr = {
      english: [
        {
          title: 'Tasbih',
          arabic: 'سُبْحَانَ اللَّهِ وَبِحَمْدِهِ',
          translation: 'Glory be to Allah and praise be to Him',
          reference: 'Sahih Bukhari'
        },
        {
          title: 'Tahlil',
          arabic: 'لَا إِلَهَ إِلَّا اللَّهُ وَحْدَهُ لَا شَرِيكَ لَهُ',
          translation: 'There is no god except Allah alone, without any partners',
          reference: 'Sahih Muslim'
        },
        {
          title: 'Takbir',
          arabic: 'اللَّهُ أَكْبَرُ',
          translation: 'Allah is the Greatest',
          reference: 'Daily Remembrance'
        },
        {
          title: 'Hawqala',
          arabic: 'لَا حَوْلَ وَلَا قُوَّةَ إِلَّا بِاللَّهِ',
          translation: 'There is no power and no strength except with Allah',
          reference: 'Sahih Bukhari'
        }
      ],
      spanish: [
        {
          title: 'Tasbih',
          arabic: 'سُبْحَانَ اللَّهِ وَبِحَمْدِهِ',
          translation: 'Gloria sea para Allah y alabado sea Él',
          reference: 'Sahih Bukhari'
        },
        {
          title: 'Tahlil',
          arabic: 'لَا إِلَهَ إِلَّا اللَّهُ وَحْدَهُ لَا شَرِيكَ لَهُ',
          translation: 'No hay dios excepto Allah solo, sin ningún socio',
          reference: 'Sahih Muslim'
        },
        {
          title: 'Takbir',
          arabic: 'اللَّهُ أَكْبَرُ',
          translation: 'Allah es el Más Grande',
          reference: 'Recuerdo Diario'
        },
        {
          title: 'Hawqala',
          arabic: 'لَا حَوْلَ وَلَا قُوَّةَ إِلَّا بِاللَّهِ',
          translation: 'No hay poder ni fuerza excepto con Allah',
          reference: 'Sahih Bukhari'
        }
      ],
      french: [
        {
          title: 'Tasbih',
          arabic: 'سُبْحَانَ اللَّهِ وَبِحَمْدِهِ',
          translation: 'Gloire à Allah et louange à Lui',
          reference: 'Sahih Bukhari'
        },
        {
          title: 'Tahlil',
          arabic: 'لَا إِلَهَ إِلَّا اللَّهُ وَحْدَهُ لَا شَرِيكَ لَهُ',
          translation: 'Il n\'y a de dieu qu\'Allah seul, sans aucun associé',
          reference: 'Sahih Muslim'
        },
        {
          title: 'Takbir',
          arabic: 'اللَّهُ أَكْبَرُ',
          translation: 'Allah est le Plus Grand',
          reference: 'Rappel Quotidien'
        },
        {
          title: 'Hawqala',
          arabic: 'لَا حَوْلَ وَلَا قُوَّةَ إِلَّا بِاللَّهِ',
          translation: 'Il n\'y a de puissance ni de force qu\'avec Allah',
          reference: 'Sahih Bukhari'
        }
      ],
      italian: [
        {
          title: 'Tasbih',
          arabic: 'سُبْحَانَ اللَّهِ وَبِحَمْدِهِ',
          translation: 'Gloria ad Allah e lode a Lui',
          reference: 'Sahih Bukhari'
        },
        {
          title: 'Tahlil',
          arabic: 'لَا إِلَهَ إِلَّا اللَّهُ وَحْدَهُ لَا شَرِيكَ لَهُ',
          translation: 'Non c\'è dio eccetto Allah solo, senza alcun socio',
          reference: 'Sahih Muslim'
        },
        {
          title: 'Takbir',
          arabic: 'اللَّهُ أَكْبَرُ',
          translation: 'Allah è il Più Grande',
          reference: 'Ricordo Quotidiano'
        },
        {
          title: 'Hawqala',
          arabic: 'لَا حَوْلَ وَلَا قُوَّةَ إِلَّا بِاللَّهِ',
          translation: 'Non c\'è potere né forza eccetto con Allah',
          reference: 'Sahih Bukhari'
        }
      ]
    };

    this.dailyHadith = {
      english: [
        {
          title: 'Intentions',
          arabic: 'إِنَّمَا الْأَعْمَالُ بِالنِّيَّاتِ',
          translation: 'Actions are but by intention',
          reference: 'Sahih Bukhari'
        },
        {
          title: 'Kindness',
          arabic: 'مَنْ لَا يَرْحَمُ لَا يُرْحَمُ',
          translation: 'Whoever does not show mercy will not be shown mercy',
          reference: 'Sahih Bukhari'
        },
        {
          title: 'Knowledge',
          arabic: 'طَلَبُ الْعِلْمِ فَرِيضَةٌ عَلَى كُلِّ مُسْلِمٍ',
          translation: 'Seeking knowledge is obligatory upon every Muslim',
          reference: 'Ibn Majah'
        },
        {
          title: 'Good Character',
          arabic: 'إِنَّ مِنْ أَحْسَنِ الْإِسْلَامِ حُسْنُ الْخُلُقِ',
          translation: 'Among the best of Islam is good character',
          reference: 'Sahih Muslim'
        }
      ],
      spanish: [
        {
          title: 'Intenciones',
          arabic: 'إِنَّمَا الْأَعْمَالُ بِالنِّيَّاتِ',
          translation: 'Las acciones son solo por intención',
          reference: 'Sahih Bukhari'
        },
        {
          title: 'Bondad',
          arabic: 'مَنْ لَا يَرْحَمُ لَا يُرْحَمُ',
          translation: 'Quien no muestra misericordia no será mostrado misericordia',
          reference: 'Sahih Bukhari'
        },
        {
          title: 'Conocimiento',
          arabic: 'طَلَبُ الْعِلْمِ فَرِيضَةٌ عَلَى كُلِّ مُسْلِمٍ',
          translation: 'Buscar conocimiento es obligatorio para todo musulmán',
          reference: 'Ibn Majah'
        },
        {
          title: 'Buen Carácter',
          arabic: 'إِنَّ مِنْ أَحْسَنِ الْإِسْلَامِ حُسْنُ الْخُلُقِ',
          translation: 'Entre lo mejor del Islam está el buen carácter',
          reference: 'Sahih Muslim'
        }
      ],
      french: [
        {
          title: 'Intentions',
          arabic: 'إِنَّمَا الْأَعْمَالُ بِالنِّيَّاتِ',
          translation: 'Les actions ne sont que par intention',
          reference: 'Sahih Bukhari'
        },
        {
          title: 'Bonté',
          arabic: 'مَنْ لَا يَرْحَمُ لَا يُرْحَمُ',
          translation: 'Quiconque ne montre pas de miséricorde ne sera pas montré de miséricorde',
          reference: 'Sahih Bukhari'
        },
        {
          title: 'Connaissance',
          arabic: 'طَلَبُ الْعِلْمِ فَرِيضَةٌ عَلَى كُلِّ مُسْلِمٍ',
          translation: 'Chercher la connaissance est obligatoire pour tout musulman',
          reference: 'Ibn Majah'
        },
        {
          title: 'Bon Caractère',
          arabic: 'إِنَّ مِنْ أَحْسَنِ الْإِسْلَامِ حُسْنُ الْخُلُقِ',
          translation: 'Parmi le meilleur de l\'Islam est le bon caractère',
          reference: 'Sahih Muslim'
        }
      ],
      italian: [
        {
          title: 'Intenzioni',
          arabic: 'إِنَّمَا الْأَعْمَالُ بِالنِّيَّاتِ',
          translation: 'Le azioni sono solo per intenzione',
          reference: 'Sahih Bukhari'
        },
        {
          title: 'Gentilezza',
          arabic: 'مَنْ لَا يَرْحَمُ لَا يُرْحَمُ',
          translation: 'Chi non mostra misericordia non sarà mostrato misericordia',
          reference: 'Sahih Bukhari'
        },
        {
          title: 'Conoscenza',
          arabic: 'طَلَبُ الْعِلْمِ فَرِيضَةٌ عَلَى كُلِّ مُسْلِمٍ',
          translation: 'Cercare la conoscenza è obbligatorio per ogni musulmano',
          reference: 'Ibn Majah'
        },
        {
          title: 'Buon Carattere',
          arabic: 'إِنَّ مِنْ أَحْسَنِ الْإِسْلَامِ حُسْنُ الْخُلُقِ',
          translation: 'Tra il meglio dell\'Islam c\'è il buon carattere',
          reference: 'Sahih Muslim'
        }
      ]
    };
  }

  // Clear any cached content (if needed)
  clearCache() {
    console.log('🗑️ MultilingualDailyContentService: Clearing cache');
  }

  // Get daily content in the specified language
  getDailyContent(language = 'english') {
    const today = new Date();
    const dayOfYear = Math.floor((today - new Date(today.getFullYear(), 0, 0)) / 1000 / 60 / 60 / 24);
    
    // Get content arrays for the specified language
    const verses = this.quranVerses[language] || this.quranVerses.english;
    const duas = this.dailyDuas[language] || this.dailyDuas.english;
    const dhikr = this.dailyDhikr[language] || this.dailyDhikr.english;
    const hadith = this.dailyHadith[language] || this.dailyHadith.english;
    
    // Calculate indices based on day of year
    const verseIndex = dayOfYear % verses.length;
    const duaIndex = dayOfYear % duas.length;
    const dhikrIndex = dayOfYear % dhikr.length;
    const hadithIndex = dayOfYear % hadith.length;
    
    console.log(`🌍 MultilingualDailyContentService: Getting content for language: ${language}, day: ${dayOfYear}`);
    console.log(`📖 Verse index: ${verseIndex}, Dua index: ${duaIndex}, Dhikr index: ${dhikrIndex}, Hadith index: ${hadithIndex}`);
    
    const content = [
      {
        type: t('verseOfTheDay', language),
        title: verses[verseIndex].title,
        arabic: verses[verseIndex].arabic,
        translation: verses[verseIndex].translation,
        reference: verses[verseIndex].reference,
        color: '#2196F3',
        icon: 'book-outline'
      },
      {
        type: t('duaOfTheDay', language),
        title: duas[duaIndex].title,
        arabic: duas[duaIndex].arabic,
        translation: duas[duaIndex].translation,
        reference: duas[duaIndex].reference,
        color: '#4CAF50',
        icon: 'hand-left-outline'
      },
      {
        type: t('dhikrOfTheDay', language),
        title: dhikr[dhikrIndex].title,
        arabic: dhikr[dhikrIndex].arabic,
        translation: dhikr[dhikrIndex].translation,
        reference: dhikr[dhikrIndex].reference,
        color: '#FF9800',
        icon: 'refresh-outline'
      },
      {
        type: t('hadithOfTheDay', language),
        title: hadith[hadithIndex].title,
        arabic: hadith[hadithIndex].arabic,
        translation: hadith[hadithIndex].translation,
        reference: hadith[hadithIndex].reference,
        color: '#9C27B0',
        icon: 'library-outline'
      }
    ];
    
    console.log(`🌍 MultilingualDailyContentService: Generated content for ${language}:`, content.map(item => ({ type: item.type, title: item.title })));
    
    return content;
  }
}

// Create and export a singleton instance
const multilingualDailyContentService = new MultilingualDailyContentService();
export default multilingualDailyContentService; 