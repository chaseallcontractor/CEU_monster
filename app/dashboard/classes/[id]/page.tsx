export default function ClassDetailPage(props: any) {
  const id = (props as any)?.params?.id as string;

  return (
    <main className="p-6">
      <h1 className="text-xl font-semibold">Class {id}</h1>
      <p>Detail page placeholder (App Router).</p>
    </main>
  );
}
