import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import Link from "next/link";

const settingsLinks = [
  {
    title: "Sidebar",
    href: "/admin/site-settings/sidebar",
    description: "Manage sidebar navigation.",
  },
  {
    title: "Theme",
    href: "/admin/site-settings/theme",
    description: "Customize the look and feel of the site.",
  },
  {
    title: "Header",
    href: "/admin/site-settings/header",
    description: "Configure the main site header.",
  },
  {
    title: "Configuration",
    href: "/admin/site-settings/configuration",
    description: "Manage general site configuration.",
  },
];

export default function SiteSettingsPage() {
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Site Settings</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-6 md:grid-cols-2">
            {settingsLinks.map((link) => (
              <Link href={link.href} key={link.href} className="block p-6 border rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800">
                <h5 className="mb-2 text-2xl font-bold tracking-tight text-gray-900 dark:text-white">{link.title}</h5>
                <p className="font-normal text-gray-700 dark:text-gray-400">{link.description}</p>
              </Link>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}