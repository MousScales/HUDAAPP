export const HUDDA_CREATOR_UID = 'xP5Wza4BXeOoEE4g0vYyi7ftwzu1';

export function isCreatorUid(uid) {
  return uid === HUDDA_CREATOR_UID;
}

export function getAuthEmail(user) {
  if (!user) return '';
  if (user.email) return user.email;
  const providerEmail = user.providerData?.find((provider) => provider.email)?.email;
  return providerEmail || '';
}

export function isCreatorUser(user) {
  return isCreatorUid(user?.uid);
}

export function isCreatorAuthor(data) {
  if (!data) return false;
  if (data.isCreator === true) return true;
  return data.authorId === HUDDA_CREATOR_UID;
}
