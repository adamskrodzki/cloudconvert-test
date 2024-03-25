// pages/api/user.js

export default function handler(req, res) {
  // Get the HTTP method (GET, POST, etc.)
  const { method } = req;

  switch (method) {
    case 'GET':
      // Handle GET request
      res.status(200).json({ name: 'John Doe' });
      break;
    default:
      // Handle any other HTTP method
      res.setHeader('Allow', ['GET']);
      res.status(405).end(`Method ${method} Not Allowed`);
  }
}
