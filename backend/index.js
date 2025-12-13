// backend/index.js
import { ApolloServer } from '@apollo/server';
import { startStandaloneServer } from '@apollo/server/standalone';

import mergedResolvers from './resolvers/index.js';
import mergedTypeDefs from './typeDefs/index.js';

// Optional: replace buildContext function if you had auth logic
const buildContext = async ({ req }) => {
  // Example: extract token from headers
  const token = req.headers.authorization || '';
  return { token, req };
};

const server = new ApolloServer({
  typeDefs: mergedTypeDefs,
  resolvers: mergedResolvers,
});

const { url } = await startStandaloneServer(server, {
  listen: { port: 4000 },
  context: buildContext, // Apollo v5 context
  cors: {
    origin: '*', // allow all origins
    credentials: true,
  },
});

console.log(`🚀 Server ready at ${url}`);
