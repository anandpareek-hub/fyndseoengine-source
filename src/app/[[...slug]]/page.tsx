import PersonalSeoWorkspace from "@/components/personal-seo-workspace";

export default async function CatchAllPage({
  params,
}: {
  params: Promise<{ slug?: string[] }>;
}) {
  const { slug = [] } = await params;
  const legacyPath = slug.length ? `/${slug.join("/")}` : null;

  return <PersonalSeoWorkspace legacyPath={legacyPath} />;
}
