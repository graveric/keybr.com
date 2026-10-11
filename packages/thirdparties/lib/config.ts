/*
 * The bundler fills in these constants at build time
 * with the values taken from an `env` file.
 */

export const paddleToken = process.env.PADDLE_TOKEN || "0";
export const paddlePriceId = process.env.PADDLE_PRICE_ID || "0";
