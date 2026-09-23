import app from '../src/app';

// Universal Serverless Function handler for Vercel
const handler = (req: any, res: any) => {
  return (app as any)(req, res);
};

// Inherit all Express app properties and middleware
Object.assign(handler, app);

export default handler;
module.exports = handler;
module.exports.default = handler;
