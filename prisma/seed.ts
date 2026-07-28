import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

function slugify(input: string): string {
  return input
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60) || "collection";
}

async function main() {
  const email = "demo@xemphim.local";
  const password = "Demo1234!";
  const passwordHash = await bcrypt.hash(password, 10);

  const user = await prisma.user.upsert({
    where: { email },
    update: { name: "Người dùng Demo" },
    create: {
      email,
      name: "Người dùng Demo",
      passwordHash,
    },
  });

  const favoriteSlug = slugify("Yêu thích");
  await prisma.collection.upsert({
    where: { userId_slug: { userId: user.id, slug: favoriteSlug } },
    update: {},
    create: {
      userId: user.id,
      name: "Yêu thích",
      slug: favoriteSlug,
    },
  });

  console.log(`Seed xong. Đăng nhập với ${email} / ${password}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
