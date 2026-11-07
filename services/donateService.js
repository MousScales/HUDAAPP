import { initPaymentSheet, presentPaymentSheet } from '@stripe/stripe-react-native';
import { getFunctions, httpsCallable } from 'firebase/functions';
import { getAuth, authStateReady } from 'firebase/auth';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import app, { firestore } from '../firebase';
import { STRIPE_CONFIG, isStripeConfigured } from '../config/stripeConfig';
import { getAuthEmail, isCreatorUser } from '../config/donateConfig';

export const DEMO_SUPPORTERS = [
  {
    id: 'mock-1',
    donorName: 'Amina K.',
    impactMessage: 'Hudā helped me learn my daily prayers when I first converted. BarakAllahu feek.',
    isAnonymous: false,
    isDemo: true,
  },
  {
    id: 'mock-2',
    donorName: '',
    impactMessage: 'This app has been a blessing for my family. May Allah reward the team behind Hudā.',
    isAnonymous: true,
    isDemo: true,
  },
  {
    id: 'mock-3',
    donorName: 'Omar R.',
    impactMessage: 'The lessons here made Islam feel approachable. Grateful this exists.',
    isAnonymous: false,
    isDemo: true,
  },
];

export function getDisplaySupporters(realSupporters) {
  const real = Array.isArray(realSupporters) ? realSupporters.slice(0, 3) : [];
  if (real.length >= 3) {
    return real;
  }
  if (real.length === 0) {
    return DEMO_SUPPORTERS;
  }
  return [...real, ...DEMO_SUPPORTERS.slice(0, 3 - real.length)];
}

function getAmountInCents(amountInCents) {
  const parsed = Number.parseInt(String(amountInCents), 10);
  if (!Number.isFinite(parsed) || parsed < STRIPE_CONFIG.minAmountCents) {
    throw new Error('MINIMUM_DONATION');
  }
  return parsed;
}

function normalizeDonorDetails(details = {}) {
  const donorName = typeof details.donorName === 'string' ? details.donorName.trim() : '';
  const impactMessage = typeof details.impactMessage === 'string' ? details.impactMessage.trim() : '';
  const sharePublicly = details.sharePublicly === true;
  const isAnonymous = details.isAnonymous === true;

  return {
    donorName,
    impactMessage,
    sharePublicly,
    isAnonymous,
  };
}

export async function startDonation(amountInCents, donorDetails = {}) {
  if (!isStripeConfigured()) {
    throw new Error('STRIPE_NOT_CONFIGURED');
  }

  const cents = getAmountInCents(amountInCents);
  const { donorName, impactMessage, sharePublicly, isAnonymous } = normalizeDonorDetails(donorDetails);

  if (sharePublicly && !impactMessage) {
    throw new Error('IMPACT_MESSAGE_REQUIRED');
  }

  const functions = getFunctions(app, 'us-central1');
  const createDonationPaymentIntent = httpsCallable(functions, 'createDonationPaymentIntent');
  const result = await createDonationPaymentIntent({
    amountInCents: cents,
    currency: STRIPE_CONFIG.currency,
    donorName,
    impactMessage,
    sharePublicly,
    isAnonymous,
  });

  const clientSecret = result?.data?.clientSecret;
  const donationId = result?.data?.donationId;
  if (!clientSecret) {
    throw new Error('PAYMENT_INTENT_MISSING');
  }

  const { error: initError } = await initPaymentSheet({
    merchantDisplayName: 'Hudā',
    paymentIntentClientSecret: clientSecret,
    returnURL: 'huda://donate',
    defaultBillingDetails: donorName && !isAnonymous ? { name: donorName } : undefined,
    billingDetailsCollectionConfiguration: {
      name: 'always',
      email: 'automatic',
      phone: 'never',
      address: 'never',
    },
    appearance: {
      colors: {
        primary: '#D4AF37',
        background: '#141414',
        componentBackground: '#1C1C1C',
        componentBorder: '#333333',
        componentDivider: '#333333',
        primaryText: '#1A1A1A',
        secondaryText: '#B8B8B8',
        componentText: '#FFFFFF',
        placeholderText: '#777777',
        icon: '#FFFFFF',
        error: '#FF6B6B',
      },
      shapes: {
        borderRadius: 12,
      },
    },
  });

  if (initError) {
    throw new Error(initError.message || 'PAYMENT_SHEET_INIT_FAILED');
  }

  const { error: presentError } = await presentPaymentSheet();

  if (presentError) {
    if (presentError.code === 'Canceled') {
      throw new Error('PAYMENT_CANCELED');
    }
    throw new Error(presentError.message || 'PAYMENT_FAILED');
  }

  if (donationId) {
    try {
      const confirmDonationPayment = httpsCallable(functions, 'confirmDonationPayment');
      const confirmResult = await confirmDonationPayment({ donationId });
      return {
        donationId,
        visibleOnWall: confirmResult?.data?.visibleOnWall === true,
      };
    } catch (confirmError) {
      console.warn('confirmDonationPayment failed; webhook may still complete:', confirmError?.message || confirmError);
    }
  }

  return { donationId, visibleOnWall: false };
}

export async function fetchPublicDonations() {
  try {
    const functions = getFunctions(app, 'us-central1');
    const getPublicDonations = httpsCallable(functions, 'getPublicDonations');
    const result = await getPublicDonations();
    const donations = Array.isArray(result?.data?.donations) ? result.data.donations : [];

    console.log(`fetchPublicDonations: ${donations.length} real supporter(s) on wall`);

    return donations.map(({
      id,
      donorName,
      impactMessage,
      isAnonymous,
      likeCount,
      creatorLiked,
      likedByMe,
    }) => ({
      id,
      donorName,
      impactMessage,
      isAnonymous: isAnonymous === true,
      likeCount: Number.isFinite(likeCount) ? likeCount : 0,
      creatorLiked: creatorLiked === true,
      likedByMe: likedByMe === true,
      isDemo: false,
    }));
  } catch (error) {
    console.warn('fetchPublicDonations failed:', error?.message || error);
    return [];
  }
}

export async function toggleDonationLike(donationId) {
  const firebaseAuth = getAuth(app);
  await authStateReady(firebaseAuth);
  const user = firebaseAuth.currentUser;

  if (!user) {
    throw new Error('SIGN_IN_REQUIRED');
  }

  await user.getIdToken(true);

  const donationRef = doc(firestore, 'publicDonations', donationId);
  const donationSnap = await getDoc(donationRef);

  if (!donationSnap.exists()) {
    throw new Error('NOT_FOUND');
  }

  const data = donationSnap.data() || {};
  if (data.visibleOnWall !== true) {
    throw new Error('NOT_ON_WALL');
  }

  const likes = Array.isArray(data.likes) ? [...data.likes] : [];
  const wasLiked = likes.includes(user.uid);
  const newLikes = wasLiked
    ? likes.filter((id) => id !== user.uid)
    : [...likes, user.uid];

  let creatorLiked = data.creatorLiked === true;
  if (isCreatorUser(user)) {
    creatorLiked = !wasLiked;
  }

  await updateDoc(donationRef, {
    likes: newLikes,
    likeCount: newLikes.length,
    creatorLiked,
  });

  return {
    liked: !wasLiked,
    likeCount: newLikes.length,
    creatorLiked,
  };
}
