import { redirect, RedirectType } from "next/navigation";

export default function Home() {
  redirect("/screens/authpage", RedirectType.push);

  return null;
}
