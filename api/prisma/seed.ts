import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const CATEGORIES = [
  "Business", "Restaurant", "Fashion", "Events", "Real Estate", "Education",
  "Fitness", "Technology", "Travel", "Food", "Sales", "Announcements", "Social Media",
];

async function main() {
  for (const name of CATEGORIES) {
    await prisma.templateCategory.upsert({ where: { name }, create: { name }, update: {} });
  }

  const sales = await prisma.templateCategory.findUniqueOrThrow({ where: { name: "Sales" } });
  const events = await prisma.templateCategory.findUniqueOrThrow({ where: { name: "Events" } });

  await prisma.template.upsert({
    where: { id: "seed-coffee-sale" },
    create: {
      id: "seed-coffee-sale",
      name: "Weekend Coffee Sale",
      categoryId: sales.id,
      formatId: "sale",
      isPro: false,
      document: {
        background: { type: "solid", color: "#3B2417" },
        elements: [
          { id: "el1", type: "text", name: "Headline", x: 40, y: 260, width: 720, height: 160, rotation: 0, opacity: 1, locked: false, hidden: false, text: "Weekend Coffee Sale", fontFamily: "Fraunces", fontSize: 64, fontWeight: 600, color: "#FBF4E6", align: "left" },
        ],
      },
    },
    update: {},
  });

  await prisma.template.upsert({
    where: { id: "seed-concert" },
    create: {
      id: "seed-concert",
      name: "Midnight Sessions Concert",
      categoryId: events.id,
      formatId: "flyer",
      isPro: true,
      document: {
        background: { type: "gradient", gradient: { type: "linear", from: "#1B1030", to: "#0E0B1A", angle: 160 } },
        elements: [
          { id: "el1", type: "text", name: "Headline", x: 48, y: 100, width: 560, height: 260, rotation: 0, opacity: 1, locked: false, hidden: false, text: "Midnight Sessions", fontFamily: "Fraunces", fontSize: 66, fontWeight: 600, color: "#F4EDFF", align: "left" },
        ],
      },
    },
    update: {},
  });

  console.log("Seed complete.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
