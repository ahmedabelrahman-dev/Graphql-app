import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';

import passport from 'passport';
import session from 'express-session';
import connectMongo from 'connect-mongodb-session';

import { ApolloServer } from '@apollo/server';
import { startStandaloneServer } from '@apollo/server/standalone';

import { buildContext } from 'graphql-passport';

import mergedResolvers from './resolvers/index.js';
import mergedTypeDefs from './typeDefs/index.js';

import { connectDB } from './db/connectDB.js';
import { configurePassport } from './passport/passport.config.js';

dotenv.config();
configurePassport();

await connectDB(); // connect to MongoDB

const app = express();

// --- Session store ---
const MongoDBStore = connectMongo(session);
const store = new MongoDBStore({
  uri: process.env.MONGO_URI,
  collection: 'sessions',
});
store.on('error', (err) => console.log(err));

app.use(
  session({
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    cookie: { maxAge: 1000 * 60 * 60 * 24 * 7, httpOnly: true },
    store: store,
  })
);

app.use(passport.initialize());
app.use(passport.session());

// --- Optional: CORS for REST routes ---
app.use(
  cors({
    origin: 'http://localhost:3000',
    credentials: true,
  })
);

// Example REST route
app.get('/api/hello', (req, res) => res.json({ message: 'Hello from REST!' }));

// --- Apollo Server v5 ---
const server = new ApolloServer({
  typeDefs: mergedTypeDefs,
  resolvers: mergedResolvers,
});

// Attach Apollo Server to Express app via startStandaloneServer
const { url } = await startStandaloneServer(server, {
  listen: { port: 4000 },
  context: async ({ req, res }) => buildContext({ req, res }),
  app, // attach to Express
  path: '/graphql',
  cors: {
    origin: 'http://localhost:3000',
    credentials: true,
  },
});

console.log(`🚀 Server ready at ${url}`);
