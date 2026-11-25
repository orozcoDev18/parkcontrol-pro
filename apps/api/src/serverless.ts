// Arranque para Vercel: alli no hay un servidor encendido, cada peticion
// despierta una funcion. Se guarda la app de Nest entre peticiones para no
// reconstruirla cada vez (el arranque en frio solo lo paga la primera).
import 'reflect-metadata';
import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { ExpressAdapter } from '@nestjs/platform-express';
import cookieParser from 'cookie-parser';
import express, { Express } from 'express';
import { AppModule } from './app.module';

let cached: Express | null = null;

export async function expressApp(): Promise<Express> {
  if (cached) return cached;

  const server = express();
  const app = await NestFactory.create(AppModule, new ExpressAdapter(server), {
    logger: ['error', 'warn'],
  });
  app.use(cookieParser());
  app.enableCors({
    origin: process.env.CORS_ORIGIN?.split(',') ?? true,
    credentials: true,
  });
  app.useGlobalPipes(
    new ValidationPipe({ whitelist: true, transform: true, forbidNonWhitelisted: true }),
  );
  await app.init();

  cached = server;
  return server;
}

export default async function handler(req: unknown, res: unknown) {
  const server = await expressApp();
  (server as (q: unknown, s: unknown) => void)(req, res);
}
