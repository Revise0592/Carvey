import { logoutAction } from "../actions";

export async function GET() {
  await logoutAction();
}
