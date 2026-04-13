import cron from 'node-cron';
import { prisma } from '../configs/prisma';

const expireRewards = async () => {
  const now = new Date();

  const [expiredWallets, expiredCoupons] = await Promise.all([
    prisma.wallets.updateMany({
      where: {
        balance: { gt: 0 },
        expiresAt: { lte: now },
      },
      data: {
        balance: 0,
      },
    }),
    prisma.coupons.updateMany({
      where: {
        usedAt: null,
        expiresAt: { lte: now },
      },
      data: {
        // Reuse usedAt to indicate coupon is no longer active after expiration.
        usedAt: now,
      },
    }),
  ]);

  if (expiredWallets.count > 0 || expiredCoupons.count > 0) {
    console.log(
      `[reward-expiration] Expired wallets: ${expiredWallets.count}, expired coupons: ${expiredCoupons.count}`,
    );
  }
};

export const startRewardExpirationCron = () => {
  cron.schedule('59 23 * * *', () => {
    void expireRewards();
  });
};

export { expireRewards };
