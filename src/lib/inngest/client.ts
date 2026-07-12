import { Inngest } from 'inngest';

export const inngest = new Inngest({
  id: 'courtvision-ai',
  eventKey: process.env.INNGEST_EVENT_KEY,
})
function Prisma(...args: any[]): any {
  // eslint-disable-next-line no-console
  console.warn('Placeholder: Prisma is not implemented yet.', args);
  return null;
}

export { Prisma };
function PrismaClient(...args: any[]): any {
  // eslint-disable-next-line no-console
  console.warn('Placeholder: PrismaClient is not implemented yet.', args);
  return null;
}

export { PrismaClient };