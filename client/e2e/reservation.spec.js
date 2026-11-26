// Parcours critique : connexion -> recherche -> choix du siège -> réservation -> billet -> annulation.
// Données : seed de bus_in_tunisia_test (trajet 1 Tunis -> Sousse le 15/01/2030 à 08:00, 15 TND,
// sièges 1, 2, 3 et 5 déjà occupés).
import { test, expect } from '@playwright/test'

const CLIENT = { email: 'client2.test@bus.tn', password: 'Client123!' }

async function login(page, { email, password }) {
  await page.goto('/login')
  await page.locator('#login-email').fill(email)
  await page.locator('#login-password').fill(password)
  await page.locator('#login-submit').click()
}

test.describe('E2E-01 Parcours de réservation (client)', () => {
  test('un client réserve un siège, obtient son billet puis annule sa réservation', async ({ page }, testInfo) => {
    // 1. Connexion
    await login(page, CLIENT)
    await expect(page).toHaveURL(/\/dashboard$/)

    // 2. Recherche Tunis -> Sousse le 15/01/2030 pour 1 passager
    await page.goto('/')
    await page.locator('#home-departure').selectOption('Tunis')
    await page.locator('#home-destination').selectOption('Sousse')
    await page.locator('#home-date').fill('2030-01-15')
    await page.locator('#home-passengers').fill('1')
    await page.locator('#home-search-btn').click()
    await expect(page).toHaveURL(/\/search\?departure=Tunis&destination=Sousse&date=2030-01-15/)

    // 3. Choix du trajet 1
    await page.locator('#book-trip-1').click()
    await expect(page).toHaveURL(/\/booking\/1/)
    await expect(page.getByRole('heading', { name: 'Select Your Seats' })).toBeVisible()

    // 4. Les sièges occupés (confirmés ET en attente) ne sont pas sélectionnables
    for (const seat of ['1', '2', '3', '5']) {
      await expect(page.getByRole('button', { name: seat, exact: true })).toBeDisabled()
    }

    // 5. Sélection du siège 8 et confirmation
    await page.getByRole('button', { name: '8', exact: true }).click()
    await expect(page.getByText('✓ Ready to book!')).toBeVisible()
    await page.screenshot({ path: testInfo.outputPath('05-siege-selectionne.png'), fullPage: true })
    await page.locator('#confirm-booking').click()

    // 6. Billet : trajet, siège et statut
    await expect(page).toHaveURL(/\/ticket\/\d+$/)
    const ticket = page.locator('#print-ticket')
    await expect(ticket).toContainText('Tunis')
    await expect(ticket).toContainText('Sousse')
    await expect(ticket).toContainText('8')
    await expect(ticket).toContainText('confirmed')
    // Numéro de billet = numéro de réservation sur 6 chiffres, nom du passager affiché (ANO-18)
    const reservationId = page.url().split('/').pop()
    await expect(ticket).toContainText(reservationId.padStart(6, '0'))
    await expect(ticket).not.toContainText('undefined')
    await expect(ticket).toContainText('Leila Client')
    await page.waitForFunction(() => getComputedStyle(document.querySelector('.animate-fade-in')).opacity === '1')
    await page.screenshot({ path: testInfo.outputPath('06-billet.png'), fullPage: true })

    // 7. La réservation apparaît dans le tableau de bord, puis est annulée
    await page.goto('/dashboard')
    const card = page.locator('.card', { hasText: 'Seats: 8' }).filter({ hasText: 'confirmed' })
    await expect(card).toBeVisible()
    page.once('dialog', (d) => d.accept())
    await card.getByRole('button', { name: 'Cancel' }).click()
    await expect(page.getByText('Booking cancelled')).toBeVisible()
    await expect(page.locator('.card', { hasText: 'Seats: 8' }).first()).toContainText('cancelled')

    // 8. Le siège 8 est de nouveau libre sur le trajet
    await page.goto('/booking/1?passengers=1')
    await expect(page.getByRole('button', { name: '8', exact: true })).toBeEnabled()
  })
})

test.describe('E2E-02 Authentification', () => {
  test('des identifiants invalides affichent un message et laissent l\'utilisateur sur /login', async ({ page }) => {
    await login(page, { email: CLIENT.email, password: 'mauvais-mot-de-passe' })

    await expect(page.getByText('Invalid credentials')).toBeVisible()
    await expect(page).toHaveURL(/\/login$/)
  })

  test('les identifiants du compte démo administrateur ne sont plus affichés ni acceptés (ANO-12)', async ({ page }) => {
    await page.goto('/login')
    await expect(page.getByText('admin@bus.tn / admin123')).toHaveCount(0)

    await login(page, { email: 'admin@bus.tn', password: 'admin123' })
    await expect(page.getByText('Invalid credentials')).toBeVisible()
  })

  test('un visiteur non connecté qui ouvre /booking/1 est redirigé vers /login', async ({ page }) => {
    await page.goto('/booking/1')

    await expect(page).toHaveURL(/\/login$/)
  })
})
