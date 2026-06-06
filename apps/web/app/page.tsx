import { redirect } from "next/navigation";

// 홈(COM-001)은 상품 목록(BUY-001)을 그대로 보여준다.
export default function HomePage() {
  redirect("/products");
}
