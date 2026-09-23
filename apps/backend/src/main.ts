import 'dotenv/config';
import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { NestExpressApplication } from '@nestjs/platform-express';
import helmet from 'helmet';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);

  // Render place l'API derriere un proxy : sans ca, toutes les requetes
  // sembleraient venir de la meme IP et la limitation bloquerait tout le monde.
  app.set('trust proxy', 1);

  // En-tetes de securite HTTP standard. crossOriginResourcePolicy relache :
  // l'API est appelee depuis les autres domaines Nafoore (deja filtres par CORS).
  app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } }));

  const allowedOrigins = [
    process.env.FRONTEND_URL || 'http://localhost:5173',
    process.env.ADMIN_URL || 'http://localhost:5174',
    process.env.FAMILLE_URL || 'http://localhost:5175',
    process.env.ENSEIGNANT_URL || 'http://localhost:5179',
  ];

  app.enableCors({
    origin: allowedOrigins,
    credentials: true,
  });

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  const port = process.env.PORT || 3000;
  await app.listen(port);
  console.log(`Backend Nafoore démarré sur http://localhost:${port}`);
}

bootstrap();
