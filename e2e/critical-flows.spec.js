import { expect, test } from "@playwright/test";

const appPath = "/Guerras_Egipcias/";

async function openMainMenu(page) {
  await page.goto(appPath);
  await page.getByRole("button", { name: "Iniciar" }).click();
}

test("menu abre uma partida local pronta para planejar", async ({ page }) => {
  await openMainMenu(page);
  await page.getByTitle("Solo (Hotseat)").click();
  await expect(page.getByText(/Planejar|Planejamento/)).toBeVisible();
  await expect(page.getByText("Revelar")).toBeVisible();
});

test("construtor preserva um deck salvo após recarregar", async ({ page }) => {
  await openMainMenu(page);
  await page.getByTitle("Decks").click();
  await page.getByRole("button", { name: "Salvar" }).first().click();
  await page.getByPlaceholder("Nome do deck").fill("Smoke M11");
  await page.getByRole("button", { name: "Salvar" }).last().click();
  await page.reload();
  await page.getByRole("button", { name: "Iniciar" }).click();
  await page.getByTitle("Decks").click();
  await page.getByRole("button", { name: /Meus decks/ }).first().click();
  await expect(page.getByText("Smoke M11")).toBeVisible();
});

test("fluxo multiplayer chega à tela de conexão", async ({ page }) => {
  await openMainMenu(page);
  await page.getByTitle("Multiplayer").click();
  await expect(page.getByText("monte seu deck")).toBeVisible();
  await page.getByRole("button", { name: /Continuar/ }).click();
  await expect(page.getByLabel("Servidor")).toBeVisible();
  await expect(page.getByRole("button", { name: "Conectar" })).toBeVisible();
});
