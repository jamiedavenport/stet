import { env } from 'cloudflare:workers';

export const storage = env.STORAGE;

export const images = env.IMAGES;
