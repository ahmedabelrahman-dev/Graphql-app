import express from 'express';
import http from 'http';
import cors from 'cors';
import dotenv from 'dotenv';

import passport from 'passport';
import session from 'express-session';
import MongoStore from 'connect-mongo';

import { ApolloServer } from '@apollo/server';
import { expressMiddleware } from '@as-integrations/express5';
import { ApolloServerPluginDrainHttpServer } from '@apollo/server/plugin/drainHttpServer';

import { buildContext } from 'graphql-passport';

import mergedResolvers from './resolvers/index.js';
import mergedTypeDefs from './typeDefs/index.js';
import { connectDB } from './db/connectDB.js';
import { configurePassport } from './passport/passport.config.js';

dotenv.config();
configurePassport();
await connectDB();

const app = express();
const httpServer = http.createServer(app);

// --- Express session with MongoStore ---
app.use(
  session({
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    store: MongoStore.create({
      mongoUrl: process.env.MONGO_URI,
      collectionName: 'sessions',
    }),
    cookie: { httpOnly: true, maxAge: 1000 * 60 * 60 * 24 * 7 },
  })
);

// --- Passport ---
app.use(passport.initialize());
app.use(passport.session());

// --- CORS ---
app.use(
  cors({
    origin: 'http://localhost:3000',
    credentials: true,
  })
);

// --- REST route ---
app.get('/api/hello', (req, res) => res.json({ message: 'Hello from REST!' }));

// --- Apollo Server ---
const server = new ApolloServer({
  typeDefs: mergedTypeDefs,
  resolvers: mergedResolvers,
  plugins: [ApolloServerPluginDrainHttpServer({ httpServer })],
});

await server.start();

// --- Apollo middleware ---
app.use(
  '/graphql',
  cors({
    origin: 'http://localhost:3000',
    credentials: true,
  }),
  express.json(),
  expressMiddleware(server, {
    context: async ({ req, res }) => buildContext({ req, res }),
  })
);

// --- Start server ---
await new Promise((resolve) => httpServer.listen({ port: 4000 }, resolve));
console.log('🚀 Server ready at http://localhost:4000/graphql');
