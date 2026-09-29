import { Stack, router, useLocalSearchParams } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';

import type { Questionnaire } from '@/api/types';
import { stringifyAnswerValue } from '@/api/errors';
import { Banner } from '@/components/Banner';
import { Button } from '@/components/Button';
import { Screen } from '@/components/Screen';
import { StateView } from '@/components/StateView';
import { StatusPill } from '@/components/StatusPill';
import { formatIstTimestamp } from '@/lib/ist';
import { readCachedQuestionnaire } from '@/lib/questionnaire';
import { useNetwork } from '@/providers/NetworkProvider';
import { useVisits } from '@/providers/VisitsProvider';
import { colors, radius, spacing, typography } from '@/theme';

export default function VisitDetailsScreen() {
  const { clientId } = useLocalSearchParams<{ clientId: string }>();
  const { myVisits, sync, discard, isSyncing } = useVisits();
  const { isOnline } = useNetwork();
  const [questionnaire, setQuestionnaire] = useState<Questionnaire | null>(null);

  const visit = useMemo(
    () => myVisits.find((candidate) => candidate.clientId === clientId) ?? null,
    [myVisits, clientId]
  );

  // The question text is a convenience. A visit from an earlier month may
  // reference questions this device no longer has, so the raw value is always
  // shown underneath and the id is never dropped.
  useEffect(() => {
    readCachedQuestionnaire().then(setQuestionnaire);
  }, []);

  if (!visit) {
    return (
      <Screen style={styles.screen}>
        <StateView
          kind="empty"
          title="Visit not found"
          message="It is no longer on this phone."
          actionLabel="Back to my visits"
          onAction={() => router.replace('/visits')}
        />
      </Screen>
    );
  }

  const questionText = (questionId: string) =>
    questionnaire?.questions.find((question) => question.questionId === questionId)?.text ?? null;

  return (
    <Screen style={styles.screen}>
      <Stack.Screen options={{ title: 'Visit details' }} />
      <ScrollView contentContainerStyle={styles.scroll}>
        <View style={styles.top}>
          <StatusPill status={visit.status} />
          <Text style={styles.school}>{visit.schoolName}</Text>
          <Text style={styles.meta}>UDISE {visit.udiseCode}</Text>
          <Text style={styles.meta}>Recorded {formatIstTimestamp(visit.visitedAt)} IST</Text>
          {visit.syncedAt ? (
            <Text style={styles.meta}>Synced {formatIstTimestamp(visit.syncedAt)} IST</Text>
          ) : null}
        </View>

        {visit.status === 'failed' && visit.failure ? (
          <Banner
            tone="danger"
            title={`Rejected by the server — ${visit.failure.code}`}
            message={visit.failure.message}
          />
        ) : null}

        {visit.failure && visit.failure.details.length > 1 ? (
          <View style={styles.details}>
            <Text style={styles.detailsTitle}>All problems</Text>
            {visit.failure.details.map((detail, index) => (
              <Text key={`${detail.field}-${index}`} style={styles.detailLine}>
                • {detail.message}
              </Text>
            ))}
          </View>
        ) : null}

        {visit.status === 'pending' ? (
          <Banner
            tone="info"
            message={
              visit.attempts > 0
                ? `Saved on this phone. ${visit.attempts} attempt(s) so far; it will be sent automatically when the network is back.`
                : 'Saved on this phone and waiting to be sent.'
            }
          />
        ) : null}

        <View style={styles.answers}>
          <Text style={styles.sectionTitle}>Answers</Text>
          {visit.answers.map((answer) => {
            const text = questionText(answer.questionId);
            return (
              <View key={answer.questionId} style={styles.answer}>
                <Text style={styles.answerQuestion}>
                  {text ?? answer.questionId}
                  {text ? null : <Text style={styles.answerId}> · {answer.questionId}</Text>}
                </Text>
                <Text style={styles.answerValue}>{stringifyAnswerValue(answer.value)}</Text>
              </View>
            );
          })}
        </View>

        <View style={styles.clientIdCard}>
          <Text style={styles.sectionTitle}>clientId</Text>
          <Text selectable style={styles.clientId}>
            {visit.clientId}
          </Text>
          <Text style={styles.hint}>
            Generated on this phone. The server has a unique index on it, so this visit can be
            sent any number of times and still exists exactly once in MongoDB.
          </Text>
        </View>

        <View style={styles.actions}>
          {visit.status === 'failed' ? (
            <Button
              label="Retry now"
              disabled={!isOnline || isSyncing}
              busy={isSyncing}
              onPress={() => void sync()}
            />
          ) : null}
          {visit.status === 'failed' ? (
            <Button
              label="Discard from this phone"
              variant="danger"
              onPress={async () => {
                await discard(visit.clientId);
                router.back();
              }}
            />
          ) : null}
          {visit.status === 'synced' ? (
            <Text style={styles.hint}>
              The server answered 201 when this visit was created. Opening it again does not create
              a second record.
            </Text>
          ) : null}
        </View>
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  screen: { paddingHorizontal: 0 },
  scroll: { padding: spacing.lg, gap: spacing.lg, paddingBottom: spacing.xxl },
  top: { gap: 3 },
  school: { ...typography.title, color: colors.text, marginTop: spacing.xs },
  meta: { ...typography.caption, color: colors.textMuted },
  details: {
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    gap: 4,
  },
  detailsTitle: { ...typography.label, color: colors.text },
  detailLine: { ...typography.caption, color: colors.textMuted, lineHeight: 18 },
  answers: { gap: spacing.sm },
  sectionTitle: { ...typography.label, color: colors.textMuted },
  answer: {
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    gap: 3,
  },
  answerQuestion: { ...typography.caption, color: colors.textMuted, lineHeight: 17 },
  answerId: { color: colors.textFaint },
  answerValue: { ...typography.body, color: colors.text, fontWeight: '600' },
  clientIdCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    gap: spacing.xs,
  },
  clientId: { fontFamily: 'monospace', fontSize: 12, color: colors.text },
  hint: { ...typography.caption, color: colors.textFaint, lineHeight: 17 },
  actions: { gap: spacing.sm },
});
