export const inputClass = 'mt-2 w-full rounded-lg border border-line bg-white px-3.5 py-3 text-sm placeholder:text-muted focus:border-brand focus:outline-brand';
export const buttonClass = 'rounded-lg bg-brand px-5 py-2.5 text-sm font-semibold text-white hover:bg-brand/90 focus:outline-brand disabled:opacity-50';
export function ErrorMessage({ message }: { message: string | null }) {
  return message ? <p role="alert" className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800">{message}</p> : null;
}
