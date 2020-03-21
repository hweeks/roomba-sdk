export default function (user: string, password: string): Error {
  if (!user) throw new Error('robotID is required.');
  if (!password) throw new Error('password is required.');

  throw new Error('Not implemented.');
}
