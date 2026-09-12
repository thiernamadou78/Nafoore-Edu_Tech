function urlBase64ToUint8Array(base64String) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4)
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/')
  const rawData = window.atob(base64)
  const outputArray = new Uint8Array(rawData.length)
  for (let i = 0; i < rawData.length; i++) {
    outputArray[i] = rawData.charCodeAt(i)
  }
  return outputArray
}

export function isPushSupported() {
  return (
    typeof window !== 'undefined' &&
    'serviceWorker' in navigator &&
    'PushManager' in window &&
    'Notification' in window
  )
}

// Demande la permission puis (ré)abonne cet appareil aux notifications push,
// et enregistre l'abonnement côté backend — utilisé pour rappeler à
// l'enseignant de scanner le Pass QR au début/à la fin d'une séance.
export async function subscribeToPush(api) {
  if (!isPushSupported()) {
    throw new Error("Les notifications ne sont pas prises en charge sur cet appareil.")
  }

  const permission = await Notification.requestPermission()
  if (permission !== 'granted') {
    throw new Error('Notifications refusées.')
  }

  const registration = await navigator.serviceWorker.ready
  let subscription = await registration.pushManager.getSubscription()
  if (!subscription) {
    const vapidKey = import.meta.env.VITE_VAPID_PUBLIC_KEY
    if (!vapidKey) {
      throw new Error(
        "Notifications indisponibles pour l'instant (configuration manquante). Contactez l'équipe Nafoore Education.",
      )
    }
    subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(vapidKey),
    })
  }

  const { endpoint, keys } = subscription.toJSON()
  await api.post('/teacher/push/subscribe', { endpoint, keys })
  return subscription
}
