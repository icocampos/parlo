import { StatusBar } from 'expo-status-bar'
import { AuthScreen } from '../src/features/auth/auth-screen'

export default function Index() {
  return (
    <>
      <StatusBar style="dark" />
      <AuthScreen />
    </>
  )
}
