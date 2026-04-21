import React from 'react'
import { StyleSheet, View } from 'react-native'
import { useRouter } from 'expo-router'
import { CVButton, CVText } from '../../components/ui'

export default function SessionsScreen() {
  const router = useRouter()

  return (
    <View style={s.screen}>
      <View style={s.header}>
        <CVText preset="screenTitle">Sessions</CVText>
        <CVText preset="overline" color="tertiary">
          mission control
        </CVText>
      </View>

      <View style={s.card}>
        <CVText preset="sectionTitle" color="primary">
          Capture
        </CVText>
        <CVText preset="body" color="secondary" style={s.bodyCopy}>
          Start a new recording and send footage to the AI pipeline.
        </CVText>
        <CVButton label="Record Session" onPress={() => router.push('/(dashboard)/upload')} />
      </View>

      <View style={s.cardMuted}>
        <CVText preset="sectionTitle" color="primary">
          Library
        </CVText>
        <CVText preset="body" color="secondary" style={s.bodyCopy}>
          Reopen previous uploads, review processing status and reports.
        </CVText>
        <CVButton variant="secondary" label="Open Previous Uploads" onPress={() => router.push('/(dashboard)/upload')} />
      </View>

      <CVText preset="caption" color="tertiary" style={s.footerNote}>
        Record is integrated in Sessions.
      </CVText>
    </View>
  )
}

const s = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: '#000',
    paddingHorizontal: 24,
    paddingTop: 32,
    paddingBottom: 24,
    gap: 20,
  },
  header: {
    gap: 6,
    marginBottom: 8,
  },
  card: {
    backgroundColor: '#080808',
    borderWidth: 0.5,
    borderColor: 'rgba(255,255,255,0.14)',
    borderRadius: 6,
    padding: 24,
    gap: 14,
  },
  cardMuted: {
    backgroundColor: '#0E0E0E',
    borderWidth: 0.5,
    borderColor: 'rgba(255,255,255,0.06)',
    borderRadius: 6,
    padding: 24,
    gap: 14,
  },
  bodyCopy: {
    fontSize: 14,
    lineHeight: 22,
  },
  footerNote: {
    marginTop: 'auto',
  },
})
