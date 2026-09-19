import { Router } from 'express';
import type { Router as RouterType } from 'express';
import { prisma } from '@radix-bet/database';

const router: RouterType = Router();

// GET /api/admin/team-images?sport=basketball&league=nba&search=lakers
router.get('/', async (req, res) => {
  try {
    const { sport, league, search } = req.query;
    const where: any = {};
    if (sport) where.sport = sport;
    if (league) where.league = league;
    if (search && typeof search === 'string') {
      where.teamName = { contains: search, mode: 'insensitive' };
    }

    const images = await prisma.teamImage.findMany({
      where,
      orderBy: [{ sport: 'asc' }, { league: 'asc' }, { teamName: 'asc' }],
    });
    res.json(images);
  } catch (error) {
    res.status(500).json({ error: String(error) });
  }
});

// PUT /api/admin/team-images/:id
router.put('/:id', async (req, res) => {
  try {
    const { imageUrl } = req.body;
    if (!imageUrl || typeof imageUrl !== 'string') {
      return res.status(400).json({ error: 'imageUrl required' });
    }

    const updated = await prisma.teamImage.update({
      where: { id: req.params.id },
      data: { imageUrl },
    });
    res.json(updated);
  } catch (error) {
    res.status(500).json({ error: String(error) });
  }
});

export { router as teamImageRouter };
