import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  StatusBar,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Dimensions,
  Alert,
  Platform
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useLanguage } from '../utils/useLanguage';
import { t } from '../utils/translations';

const { width, height } = Dimensions.get('window');

const FIRST_VERSE_MAP = {
  1: 'بِسْمِ ٱللَّهِ ٱلرَّحْمَـٰنِ ٱلرَّحِيمِ',
  2: 'الم',
  3: 'الم',
  4: 'يَـٰٓأَيُّهَا ٱلنَّاسُ ٱتَّقُوا۟ رَبَّكُمُ ٱلَّذِى خَلَقَكُم مِّن نَّفْسٍۢ وَٰحِدَةٍۢ وَخَلَقَ مِنْهَا زَوْجَهَا وَبَثَّ مِنْهُمَا رِجَالًۭا كَثِيرًۭا وَنِسَآءًۭ ۚ وَٱتَّقُوا۟ ٱللَّهَ ٱلَّذِى تَسَآءَلُونَ بِهِۦ وَٱلْأَرْحَامَ ۚ إِنَّ ٱللَّهَ كَانَ عَلَيْكُمْ رَقِيبًۭا',
  5: 'يَـٰٓأَيُّهَا ٱلَّذِينَ ءَامَنُوٓا۟ أَوْفُوا۟ بِٱلْعُقُودِ ۚ أُحِلَّتْ لَكُم بَهِيمَةُ ٱلْأَنْعَـٰمِ إِلَّا مَا يُتْلَىٰ عَلَيْكُمْ غَيْرَ مُحِلِّى ٱلصَّيْدِ وَأَنتُمْ حُرُمٌ ۗ إِنَّ ٱللَّهَ يَحْكُمُ مَا يُرِيدُ',
  6: 'ٱلْحَمْدُ لِلَّهِ ٱلَّذِى خَلَقَ ٱلسَّمَـٰوَٰتِ وَٱلْأَرْضَ وَجَعَلَ ٱلظُّلُمَـٰتِ وَٱلنُّورَ ۖ ثُمَّ ٱلَّذِينَ كَفَرُوا۟ بِرَبِّهِمْ يَعْدِلُونَ',
  7: 'المص',
  8: 'يَسْـَٔلُونَكَ عَنِ ٱلْأَنفَالِ ۖ قُلِ ٱلْأَنفَالُ لِلَّهِ وَٱلرَّسُولِ ۖ فَٱتَّقُوا۟ ٱللَّهَ وَأَصْلِحُوا۟ ذَاتَ بَيْنِكُمْ ۖ وَأَطِيعُوا۟ ٱللَّهَ وَرَسُولَهُۥٓ إِن كُنتُم مُّؤْمِنِينَ',
  9: 'بَرَآءَةٌۭ مِّنَ ٱللَّهِ وَرَسُولِهِۦٓ إِلَى ٱلَّذِينَ عَـٰهَدتُّم مِّنَ ٱلْمُشْرِكِينَ',
  10: 'الۤر ۚ تِلْكَ ءَايَـٰتُ ٱلْكِتَـٰبِ ٱلْحَكِيمِ',
  11: 'الۤر ۚ كِتَـٰبٌ أُحْكِمَتْ ءَايَـٰتُهُۥ ثُمَّ فُصِّلَتْ مِن لَّدُنْ حَكِيمٍ خَبِيرٍۢ',
  12: 'الۤر ۚ تِلْكَ ءَايَـٰتُ ٱلْكِتَـٰبِ ٱلْمُبِينِ',
  13: 'الۤمۤر ۚ تِلْكَ ءَايَـٰتُ ٱلْكِتَـٰبِ ۗ وَٱلَّذِىٓ أُنزِلَ إِلَيْكَ مِن رَّبِّكَ ٱلْحَقُّ وَلَـٰكِنَّ أَكْثَرَ ٱلنَّاسِ لَا يُؤْمِنُونَ',
  14: 'الۤر ۚ كِتَـٰبٌ أَنزَلْنَـٰهُ إِلَيْكَ لِتُخْرِجَ ٱلنَّاسَ مِنَ ٱلظُّلُمَـٰتِ إِلَى ٱلنُّورِ بِإِذْنِ رَبِّهِمْ إِلَىٰ صِرَٰطِ ٱلْعَزِيزِ ٱلْحَمِيدِ',
  15: 'الۤر ۚ تِلْكَ ءَايَـٰتُ ٱلْكِتَـٰبِ وَقُرْءَانٍۢ مُّبِينٍۢ',
  16: 'أَتَىٰٓ أَمْرُ ٱللَّهِ فَلَا تَسْتَعْجِلُوهُ ۚ سُبْحَـٰنَهُۥ وَتَعَـٰلَىٰ عَمَّا يُشْرِكُونَ',
  17: 'سُبْحَـٰنَ ٱلَّذِىٓ أَسْرَىٰ بِعَبْدِهِۦ لَيْلًۭا مِّنَ ٱلْمَسْجِدِ ٱلْحَرَامِ إِلَى ٱلْمَسْجِدِ ٱلْأَقْصَا ٱلَّذِى بَـٰرَكْنَا حَوْلَهُۥ لِنُرِيَهُۥ مِنْ ءَايَـٰتِنَآ ۚ إِنَّهُۥ هُوَ ٱلسَّمِيعُ ٱلْبَصِيرُ',
  18: 'ٱلْحَمْدُ لِلَّهِ ٱلَّذِىٓ أَنزَلَ عَلَىٰ عَبْدِهِ ٱلْكِتَـٰبَ وَلَمْ يَجْعَل لَّهُۥ عِوَجًۭا',
  19: 'كهيعص',
  20: 'طه',
  21: 'ٱقْتَرَبَ لِلنَّاسِ حِسَابُهُمْ وَهُمْ فِى غَفْلَةٍۢ مُّعْرِضُونَ',
  22: 'يَـٰٓأَيُّهَا ٱلنَّاسُ ٱتَّقُوا۟ رَبَّكُمْ ۚ إِنَّ زَلْزَلَةَ ٱلسَّاعَةِ شَىْءٌ عَظِيمٌۭ',
  23: 'قَدْ أَفْلَحَ ٱلْمُؤْمِنُونَ',
  24: 'سُورَةٌ أَنزَلْنَـٰهَا وَفَرَضْنَـٰهَا وَأَنزَلْنَا فِيهَآ ءَايَـٰتٍۢ بَيِّنَـٰتٍۢ لَّعَلَّكُمْ تَذَكَّرُونَ',
  25: 'تَبَارَكَ ٱلَّذِى نَزَّلَ ٱلْفُرْقَانَ عَلَىٰ عَبْدِهِۦ لِيَكُونَ لِلْعَـٰلَمِينَ نَذِيرًا',
  26: 'طسم',
  27: 'طس ۚ تِلْكَ ءَايَـٰتُ ٱلْقُرْءَانِ وَكِتَـٰبٍۢ مُّبِينٍۢ',
  28: 'طسم',
  29: 'الم',
  30: 'الم',
  31: 'الم',
  32: 'الم',
  33: 'يَـٰٓأَيُّهَا ٱلنَّبِىُّ ٱتَّقِ ٱللَّهَ وَلَا تُطِعِ ٱلْكَـٰفِرِينَ وَٱلْمُنَـٰفِقِينَ ۗ إِنَّ ٱللَّهَ كَانَ عَلِيمًا حَكِيمًا',
  34: 'ٱلْحَمْدُ لِلَّهِ ٱلَّذِى لَهُۥ مَا فِى ٱلسَّمَـٰوَٰتِ وَمَا فِى ٱلْأَرْضِ ۖ وَلَهُ ٱلْحَمْدُ فِى ٱلْـَٔاخِرَةِ ۚ وَهُوَ ٱلْحَكِيمُ ٱلْخَبِيرُ',
  35: 'ٱلْحَمْدُ لِلَّهِ فَاطِرِ ٱلسَّمَـٰوَٰتِ وَٱلْأَرْضِ جَاعِلِ ٱلْمَلَـٰٓئِكَةِ رُسُلًا أُو۟لِىٓ أَجْنِحَةٍۢ مَّثْنَىٰ وَثُلَـٰثَ وَرُبَـٰعَ ۚ يَزِيدُ فِى ٱلْخَلْقِ مَا يَشَآءُ ۚ إِنَّ ٱللَّهَ عَلَىٰ كُلِّ شَىْءٍۢ قَدِيرٌۭ',
  36: 'يس',
  37: 'وَٱلصَّـٰٓفَّـٰتِ صَفًّۭا',
  38: 'ص ۚ وَٱلْقُرْءَانِ ذِى ٱلذِّكْرِ',
  39: 'تَنزِيلُ ٱلْكِتَـٰبِ مِنَ ٱللَّهِ ٱلْعَزِيزِ ٱلْحَكِيمِ',
  40: 'حم',
  41: 'حم',
  42: 'حم',
  43: 'حم',
  44: 'حم',
  45: 'حم',
  46: 'حم',
  47: 'ٱلَّذِينَ كَفَرُوا۟ وَصَدُّوا۟ عَن سَبِيلِ ٱللَّهِ أَضَلَّ أَعْمَـٰلَهُمْ',
  48: 'إِنَّا فَتَحْنَا لَكَ فَتْحًۭا مُّبِينًۭا',
  49: 'يَـٰٓأَيُّهَا ٱلَّذِينَ ءَامَنُوا۟ لَا تُقَدِّمُوا۟ بَيْنَ يَدَىِ ٱللَّهِ وَرَسُولِهِۦ ۖ وَٱتَّقُوا۟ ٱللَّهَ ۚ إِنَّ ٱللَّهَ سَمِيعٌ عَلِيمٌۭ',
  50: 'ق ۚ وَٱلْقُرْءَانِ ٱلْمَجِيدِ',
  51: 'وَٱلذَّـٰرِيَـٰتِ ذَرْوًۭا',
  52: 'وَٱلطُّورِ',
  53: 'وَٱلنَّجْمِ إِذَا هَوَىٰ',
  54: 'ٱقْتَرَبَتِ ٱلسَّاعَةُ وَٱنشَقَّ ٱلْقَمَرُ',
  55: 'ٱلرَّحْمَـٰنُ',
  56: 'إِذَا وَقَعَتِ ٱلْوَاقِعَةُ',
  57: 'سَبَّحَ لِلَّهِ مَا فِى ٱلسَّمَـٰوَٰتِ وَٱلْأَرْضِ ۖ وَهُوَ ٱلْعَزِيزُ ٱلْحَكِيمُ',
  58: 'قَدْ سَمِعَ ٱللَّهُ قَوْلَ ٱلَّتِى تُجَـٰدِلُكَ فِى زَوْجِهَا وَتَشْتَكِىٓ إِلَى ٱللَّهِ وَٱللَّهُ يَسْمَعُ تَحَاوُرَكُمَآ ۚ إِنَّ ٱللَّهَ سَمِيعٌۢ بَصِيرٌۭ',
  59: 'سَبَّحَ لِلَّهِ مَا فِى ٱلسَّمَـٰوَٰتِ وَمَا فِى ٱلْأَرْضِ ۖ وَهُوَ ٱلْعَزِيزُ ٱلْحَكِيمُ',
  60: 'يَـٰٓأَيُّهَا ٱلَّذِينَ ءَامَنُوا۟ لَا تَتَّخِذُوا۟ عَدُوِّى وَعَدُوَّكُمْ أَوْلِيَآءَ تُلْقُونَ إِلَيْهِم بِٱلْمَوَدَّةِ وَقَدْ كَفَرُوا۟ بِمَا جَآءَكُم مِّنَ ٱلْحَقِّ يُخْرِجُونَ ٱلرَّسُولَ وَإِيَّاكُمْ أَن تُؤْمِنُوا۟ بِٱللَّهِ رَبِّكُمْ ۖ إِن كُنتُمْ خَرَجْتُمْ جِهَـٰدًۭا فِى سَبِيلِى وَٱبْتِغَآءَ مَرْضَاتِى ۖ تُسِرُّونَ إِلَيْهِم بِٱلْمَوَدَّةِ وَأَنَا۠ أَعْلَمُ بِمَآ أَخْفَيْتُمْ وَمَآ أَعْلَنتُمْ ۚ وَمَن يَفْعَلُهُ مِنكُمْ فَقَدْ ضَلَّ سَوَآءَ ٱلسَّبِيلِ',
  61: 'سَبَّحَ لِلَّهِ مَا فِى ٱلسَّمَـٰوَٰتِ وَمَا فِى ٱلْأَرْضِ ۖ وَهُوَ ٱلْعَزِيزُ ٱلْحَكِيمُ',
  62: 'يُسَبِّحُ لِلَّهِ مَا فِى ٱلسَّمَـٰوَٰتِ وَمَا فِى ٱلْأَرْضِ ٱلْمَلِكِ ٱلْقُدُّوسِ ٱلْعَزِيزِ ٱلْحَكِيمِ',
  63: 'إِذَا جَآءَكَ ٱلْمُنَـٰفِقُونَ قَالُوا۟ نَشْهَدُ إِنَّكَ لَرَسُولُ ٱللَّهِ ۗ وَٱللَّهُ يَعْلَمُ إِنَّكَ لَرَسُولُهُۥ وَٱللَّهُ يَشْهَدُ إِنَّ ٱلْمُنَـٰفِقِينَ لَكَـٰذِبُونَ',
  64: 'يُسَبِّحُ لِلَّهِ مَا فِى ٱلسَّمَـٰوَٰتِ وَمَا فِى ٱلْأَرْضِ ۖ لَهُ ٱلْمُلْكُ وَلَهُ ٱلْحَمْدُ ۖ وَهُوَ عَلَىٰ كُلِّ شَىْءٍۢ قَدِيرٌۭ',
  65: 'يَـٰٓأَيُّهَا ٱلنَّبِىُّ إِذَا طَلَّقْتُمُ ٱلنِّسَآءَ فَطَلِّقُوهُنَّ لِعِدَّتِهِنَّ وَأَحْصُوا۟ ٱلْعِدَّةَ ۖ وَٱتَّقُوا۟ ٱللَّهَ رَبَّكُمْ ۖ لَا تُخْرِجُوهُنَّ مِنۢ بُيُوتِهِنَّ وَلَا يَخْرُجْنَ إِلَّآ أَن يَأْتِينَ بِفَـٰحِشَةٍۢ مُّبَيِّنَةٍۢ ۚ وَتِلْكَ حُدُودُ ٱللَّهِ ۚ وَمَن يَتَعَدَّ حُدُودُ ٱللَّهِ فَقَدْ ظَلَمَ نَفْسَهُۥ ۚ لَا تَدْرِى لَعَلَّ ٱللَّهَ يُحْدِثُ بَعْدَ ذَٰلِكَ أَمْرًۭا',
  66: 'يَـٰٓأَيُّهَا ٱلنَّبِىُّ لِمَ تُحَرِّمُ مَآ أَحَلَّ ٱللَّهُ لَكَ ۖ تَبْتَغِى مَرْضَاتَ أَزْوَٰجِكَ ۚ وَٱللَّهُ غَفُورٌۭ رَّحِيمٌۭ',
  67: 'تَبَارَكَ ٱلَّذِى بِيَدِهِ ٱلْمُلْكُ وَهُوَ عَلَىٰ كُلِّ شَىْءٍۢ قَدِيرٌۭ',
  68: 'ن ۚ وَٱلْقَلَمِ وَمَا يَسْطُرُونَ',
  69: 'ٱلْحَآقَّةُ',
  70: 'سَأَلَ سَآئِلٌۢ بِعَذَابٍۢ وَاقِعٍۢ',
  71: 'إِنَّآ أَرْسَلْنَا نُوحًا إِلَىٰ قَوْمِهِۦٓ أَنْ أَنذِرْ قَوْمَكَ مِن قَبْلِ أَن يَأْتِيَهُمْ عَذَابٌ أَلِيمٌۭ',
  72: 'قُلْ أُوحِىَ إِلَىَّ أَنَّهُ ٱسْتَمَعَ نَفَرٌۭ مِّنَ ٱلْجِنِّ فَقَالُوٓا۟ إِنَّا سَمِعْنَا قُرْءَانًا عَجَبًۭا',
  73: 'يَـٰٓأَيُّهَا ٱلْمُزَّمِّلُ',
  74: 'يَـٰٓأَيُّهَا ٱلْمُدَّثِّرُ',
  75: 'لَآ أُقْسِمُ بِيَوْمِ ٱلْقِيَـٰمَةِ',
  76: 'هَلْ أَتَىٰ عَلَى ٱلْإِنسَـٰنِ حِينٌۭ مِّنَ ٱلدَّهْرِ لَمْ يَكُن شَيْـًۭٔا مَّذْكُورًۭا',
  77: 'وَٱلْمُرْسَلَـٰتِ عُرْفًۭا',
  78: 'عَمَّ يَتَسَآءَلُونَ',
  79: 'وَٱلنَّـٰزِعَـٰتِ غَرْقًۭا',
  80: 'عَبَسَ وَتَوَلَّىٰٓ',
  81: 'إِذَا ٱلشَّمْسُ كُوِّرَتْ',
  82: 'إِذَا ٱلسَّمَآءُ ٱنفَطَرَتْ',
  83: 'وَإِذَا ٱلسَّمَـٰوَٰتُ كُشِطَتْ',
  84: 'إِذَا ٱلسَّمَآءُ ٱنشَقَّتْ',
  85: 'وَٱلسَّمَآءِ ذَاتِ ٱلْبُرُوجِ',
  86: 'وَٱلسَّمَآءِ وَٱلطَّارِقِ',
  87: 'سَبِّحِ ٱسْمَ رَبِّكَ ٱلْأَعْلَى',
  88: 'هَلْ أَتَىٰكَ حَدِيثُ ٱلْغَـٰشِيَةِ',
  89: 'وَٱلْفَجْرِ',
  90: 'لَآ أُقْسِمُ بِهَـٰذَا ٱلْبَلَدِ',
  91: 'وَٱلشَّمْسِ وَضُحَىٰهَا',
  92: 'وَٱلَّيْلِ إِذَا يَغْشَىٰ',
  93: 'وَٱلضُّحَىٰ',
  94: 'أَلَمْ نَشْرَحْ لَكَ صَدْرَكَ',
  95: 'وَٱلتِّينِ وَٱلزَّيْتُونِ',
  96: 'ٱقْرَأْ بِٱسْمِ رَبِّكَ ٱلَّذِى خَلَقَ',
  97: 'إِنَّآ أَنزَلْنَـٰهُ فِى لَيْلَةِ ٱلْقَدْرِ',
  98: 'لَمْ يَكُنِ ٱلَّذِينَ كَفَرُوا۟ مِنْ أَهْلِ ٱلْكِتَـٰبِ وَٱلْمُشْرِكِينَ مُنفَكِّينَ حَتَّىٰ تَأْتِيَهُمُ ٱلْبَيِّنَةُ',
  99: 'إِذَا زُلْزِلَتِ ٱلْأَرْضُ زِلْزَالَهَا',
  100: 'وَٱلْعَـٰدِيَـٰتِ ضَبْحًۭا',
  101: 'ٱلْقَـٰرِعَةُ',
  102: 'أَلْهَىٰكُمُ ٱلتَّكَاثُرُ',
  103: 'وَٱلْعَصْرِ',
  104: 'وَيْلٌۭ لِّكُلِّ هُمَزَةٍۢ لُّمَزَةٍ',
  105: 'أَلَمْ تَرَ كَيْفَ فَعَلَ رَبُّكَ بِأَصْحَـٰبِ ٱلْفِيلِ',
  106: 'لِإِيلَـٰفِ قُرَيْشٍ',
  107: 'أَرَأَيْتَ ٱلَّذِى يُكَذِّبُ بِٱلدِّينِ',
  108: 'إِنَّآ أَعْطَيْنَـٰكَ ٱلْكَوْثَرَ',
  109: 'قُلْ يَـٰٓأَيُّهَا ٱلْكَـٰفِرُونَ',
  110: 'إِذَا جَآءَ نَصْرُ ٱللَّهِ وَٱلْفَتْحُ',
  111: 'تَبَّتْ يَدَآ أَبِى لَهَبٍۢ وَتَبَّ',
  112: 'قُلْ هُوَ ٱللَّهُ أَحَدٌ',
  113: 'قُلْ أَعُوذُ بِرَبِّ ٱلْفَلَقِ',
  114: 'قُلْ أَعُوذُ بِرَبِّ ٱلنَّاسِ'
};

export default function SimpleQuranViewer({ navigation, route }) {
  const { selectedLanguage } = route.params || {};
  const { currentLanguage } = useLanguage();
  const [loading, setLoading] = useState(true);
  const [currentSurah, setCurrentSurah] = useState(1);
  const [surahData, setSurahData] = useState(null);
  const [surahList, setSurahList] = useState([]);
  const [showSurahSelector, setShowSurahSelector] = useState(false);
  const scrollViewRef = useRef(null);
  
  // Use selectedLanguage from params, fallback to currentLanguage
  const userLanguage = selectedLanguage || currentLanguage;

  useEffect(() => {
    loadSurahList();
    loadSurah(currentSurah);
  }, []);

  const loadSurahList = async () => {
    try {
      const response = await fetch('https://api.alquran.cloud/v1/surah');
      const data = await response.json();
      if (data.code === 200) {
        setSurahList(data.data);
      }
    } catch (error) {
      console.error('Error loading surah list:', error);
    }
  };

  const loadSurah = async (surahNumber) => {
    setLoading(true);
    try {
      // Load Arabic text
      const arabicResponse = await fetch(`https://api.alquran.cloud/v1/surah/${surahNumber}`);
      const arabicData = await arabicResponse.json();
      
      // Determine translation language based on user preference
      let translationLanguage = 'en.sahih'; // Default to English
      switch (userLanguage) {
        case 'spanish':
          translationLanguage = 'es.asad';
          break;
        case 'french':
          translationLanguage = 'fr.hamidullah';
          break;
        case 'italian':
          translationLanguage = 'it.piccardo';
          break;
        default:
          translationLanguage = 'en.sahih';
      }
      
      // Load translation in user's preferred language
      const translationResponse = await fetch(`https://api.alquran.cloud/v1/surah/${surahNumber}/${translationLanguage}`);
      const translationData = await translationResponse.json();
      
      if (arabicData.code === 200 && translationData.code === 200) {
        // Combine Arabic text with user's preferred translation
        const combinedData = {
          ...arabicData.data,
          ayahs: arabicData.data.ayahs.map((ayah, index) => ({
            ...ayah,
            translation: translationData.data.ayahs[index]?.text || t('translationNotAvailable', userLanguage)
          }))
        };
        setSurahData(combinedData);
      } else {
        // Fallback to just Arabic if translation fails
        if (arabicData.code === 200) {
          setSurahData(arabicData.data);
        }
      }
    } catch (error) {
      console.error('Error loading surah:', error);
      Alert.alert(t('error', userLanguage), t('failedToLoadQuranText', userLanguage));
    } finally {
      setLoading(false);
      // Scroll to top after content is loaded
      setTimeout(() => {
        if (scrollViewRef.current) {
          scrollViewRef.current.scrollTo({ y: 0, animated: true });
        }
      }, 100);
    }
  };

  const changeSurah = (direction) => {
    const newSurah = direction === 'next' ? currentSurah + 1 : currentSurah - 1;
    if (newSurah >= 1 && newSurah <= 114) {
      setCurrentSurah(newSurah);
      loadSurah(newSurah);
    }
  };

  const getCurrentSurahName = () => {
    const surah = surahList.find(s => s.number === currentSurah);
    return surah ? surah.englishName : `Surah ${currentSurah}`;
  };

  const selectSurah = (surahNumber) => {
    setCurrentSurah(surahNumber);
    setShowSurahSelector(false);
    loadSurah(surahNumber);
  };

  if (loading && !surahData) {
    return (
      <LinearGradient colors={["#000", "#181818"]} style={styles.gradient}>
        <SafeAreaView style={styles.container}>
          <StatusBar barStyle="light-content" backgroundColor="#121212" />
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#FFD700" />
            <Text style={styles.loadingText}>{t('loadingQuran', userLanguage)}</Text>
          </View>
        </SafeAreaView>
      </LinearGradient>
    );
  }

  return (
    <LinearGradient colors={["#000", "#181818"]} style={styles.gradient}>
      <SafeAreaView style={styles.container}>
        <StatusBar barStyle="light-content" backgroundColor="#121212" />
        
                       {/* Surah Navigation */}
               <View style={styles.surahNavigation}>
                 <TouchableOpacity
                   style={styles.backButton}
                   onPress={() => navigation.goBack()}
                 >
                   <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
                 </TouchableOpacity>
                 
                 <TouchableOpacity 
                   style={styles.surahInfo}
                   onPress={() => setShowSurahSelector(true)}
                 >
                   <Text style={styles.surahName}>{getCurrentSurahName()}</Text>
                   <Text style={styles.surahNumber}>{t('surah', userLanguage)} {currentSurah}</Text>
                   <Text style={styles.tapToChange}>{t('tapToChange', userLanguage)}</Text>
                 </TouchableOpacity>
                 
                 <View style={styles.placeholder} />
               </View>

        {/* Bismillah */}
        {currentSurah !== 1 && currentSurah !== 9 && (
          <View style={styles.bismillahContainer}>
            <Text style={styles.bismillahText}>
              بِسْمِ اللَّهِ الرَّحْمَٰنِ الرَّحِيمِ
            </Text>
          </View>
        )}

                       {/* Quran Text */}
               <ScrollView
                 ref={scrollViewRef}
                 style={styles.quranContainer}
                 contentContainerStyle={[
                   styles.quranContent,
                   { paddingBottom: Platform.OS === 'android' ? 180 : 20 }
                 ]}
                 showsVerticalScrollIndicator={false}
               >
                 {surahData && surahData.ayahs && surahData.ayahs.map((ayah, index) => (
                   <View key={index} style={styles.ayahContainer}>
                     <View style={styles.ayahHeader}>
                       <View style={styles.ayahNumber}>
                         <Text style={styles.ayahNumberText}>{ayah.numberInSurah}</Text>
                       </View>
                     </View>

                     <Text style={styles.arabicText}>
                       {ayah.numberInSurah === 1 && FIRST_VERSE_MAP[currentSurah] 
                         ? FIRST_VERSE_MAP[currentSurah] 
                         : ayah.text}
                     </Text>

                     <Text style={styles.translationText}>
                       {ayah.translation || t('translationNotAvailable', userLanguage)}
                     </Text>
                   </View>
                 ))}
               </ScrollView>

        {/* Footer */}
        <View style={styles.footer}>
          <Text style={styles.footerText}>
            {t('quranViewerPreviewText', userLanguage)}
          </Text>
        </View>

        {/* Surah Selector Modal */}
        {showSurahSelector && (
          <View style={styles.modalOverlay}>
            <View style={styles.surahSelectorModal}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Select Surah</Text>
                <TouchableOpacity 
                  style={styles.closeButton}
                  onPress={() => setShowSurahSelector(false)}
                >
                  <Ionicons name="close" size={24} color="#FFFFFF" />
                </TouchableOpacity>
              </View>
              
              <ScrollView 
                style={styles.surahList} 
                showsVerticalScrollIndicator={false}
                contentContainerStyle={{
                  paddingBottom: Platform.OS === 'android' ? 180 : 20
                }}
              >
                {surahList.map((surah) => (
                  <TouchableOpacity
                    key={surah.number}
                    style={[
                      styles.surahItem,
                      currentSurah === surah.number && styles.selectedSurah
                    ]}
                    onPress={() => selectSurah(surah.number)}
                  >
                    <View style={styles.surahItemNumber}>
                      <Text style={styles.surahItemNumberText}>{surah.number}</Text>
                    </View>
                    <View style={styles.surahItemInfo}>
                      <Text style={styles.surahItemName}>{surah.englishName}</Text>
                      <Text style={styles.surahItemArabic}>{surah.name}</Text>
                    </View>
                    {currentSurah === surah.number && (
                      <Ionicons name="checkmark" size={20} color="#FFD700" />
                    )}
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
          </View>
        )}
      </SafeAreaView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  gradient: {
    flex: 1,
  },
  container: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    color: '#FFFFFF',
    fontSize: 16,
    marginTop: 10,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#2A2A2A',
  },
  backButton: {
    padding: 5,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  placeholder: {
    width: 34,
  },
  surahNavigation: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 15,
    backgroundColor: '#1A1A1A',
    borderBottomWidth: 1,
    borderBottomColor: '#2A2A2A',
  },
  navButton: {
    padding: 10,
    borderRadius: 8,
    backgroundColor: '#2A2A2A',
  },
  disabledButton: {
    backgroundColor: '#1A1A1A',
  },
  surahInfo: {
    alignItems: 'center',
  },
  surahName: {
    fontSize: 18,
    fontWeight: '600',
    color: '#FFFFFF',
    marginBottom: 2,
  },
  surahNumber: {
    fontSize: 14,
    color: '#A3B1CC',
  },
  quranContainer: {
    flex: 1,
  },
  quranContent: {
    paddingHorizontal: 20,
    paddingVertical: 20,
  },
  ayahContainer: {
    marginBottom: 30,
    paddingBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#2A2A2A',
  },
  ayahHeader: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginBottom: 15,
  },
  ayahNumber: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#2A2A2A',
    justifyContent: 'center',
    alignItems: 'center',
  },
  ayahNumberText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  arabicText: {
    fontSize: 24,
    color: '#FFFFFF',
    textAlign: 'right',
    lineHeight: 45,
    marginBottom: 15,
    fontFamily: Platform.OS === 'ios' ? 'Arial' : 'Roboto',
  },
  translationText: {
    fontSize: 16,
    color: '#A3B1CC',
    lineHeight: 24,
    textAlign: 'left',
  },
  footer: {
    paddingHorizontal: 20,
    paddingVertical: 15,
    backgroundColor: '#1A1A1A',
    borderTopWidth: 1,
    borderTopColor: '#2A2A2A',
  },
  footerText: {
    fontSize: 12,
    color: '#A3B1CC',
    textAlign: 'center',
    lineHeight: 18,
  },
  tapToChange: {
    fontSize: 10,
    color: '#A3B1CC',
    marginTop: 2,
    fontStyle: 'italic',
  },
  bismillahContainer: {
    paddingVertical: 20,
    paddingHorizontal: 20,
    alignItems: 'center',
    backgroundColor: '#1A1A1A',
    borderBottomWidth: 1,
    borderBottomColor: '#2A2A2A',
  },
  bismillahText: {
    fontSize: 28,
    color: '#FFFFFF',
    textAlign: 'center',
    fontFamily: Platform.OS === 'ios' ? 'Geeza Pro' : 'sans-serif',
    lineHeight: 50,
  },
  modalOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000,
  },
  surahSelectorModal: {
    backgroundColor: '#1A1A1A',
    borderRadius: 20,
    width: '90%',
    maxWidth: 400,
    maxHeight: '80%',
    borderWidth: 1,
    borderColor: '#2A2A2A',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#2A2A2A',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  closeButton: {
    padding: 5,
  },
  surahList: {
    maxHeight: 400,
  },
  surahItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#2A2A2A',
  },
  selectedSurah: {
    backgroundColor: '#2A2A2A',
  },
  surahItemNumber: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#3A3A3A',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 15,
  },
  surahItemNumberText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  surahItemInfo: {
    flex: 1,
  },
  surahItemName: {
    fontSize: 16,
    fontWeight: '500',
    color: '#FFFFFF',
    marginBottom: 2,
  },
  surahItemArabic: {
    fontSize: 14,
    color: '#A3B1CC',
  },
}); 