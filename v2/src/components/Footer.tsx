export function Footer() {
  const currentYear = new Date().getFullYear();
  return (
    <footer className="py-4 text-center text-sm text-gray-500">
      © {currentYear} Joshua Tree Service Group · Version 2.2.0
    </footer>
  );
}
