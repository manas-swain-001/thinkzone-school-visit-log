import { Stack, router, useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import type { Question, Questionnaire } from '@/api/types';
import { Banner } from '@/components/Banner';
import { Button } from '@/components/Button';
import { QuestionBlock } from '@/components/QuestionBlock';
import { Screen } from '@/components/Screen';
import { StateView } from '@/components/StateView';
import { HeaderLink } from '@/components/HeaderLink';
import {
  NumberAnswerInput,
  OptionInput,
  TextAnswerInput,
  YesNoInput,
} from '@/components/inputs';
import { emptyFormAnswers, rangeHint, toAnswers, validateForm, type FormAnswers } from '@/lib/answers';
import { formatIstTimestamp, istYearMonth, monthLabel } from '@/lib/ist';
import { newClientId } from '@/lib/uuid';
import { describeStaleQuestionnaire, resolveQuestionnaire } from '@/lib/questionnaire';
import { useApp } from '@/providers/AppProvider';
import { useNetwork } from '@/providers/NetworkProvider';
import { useVisits } from '@/providers/VisitsProvider';
import { colors, radius, spacing, typography } from '@/theme';

type LoadState =
  | { kind: 'loading' }
  | { kind: 'ready'; questionnaire: Questionnaire; source: 'network' | 'cache' }
  | { kind: 'stale'; message: string }
  | { kind: 'unavailable'; message: string };

export default function VisitFormScreen() {
  const params = useLocalSearchParams<{ udise?: string; name?: string }>();
  const { user } = useApp();
  const { isOnline } = useNetwork();
  const { enqueue } = useVisits();

  const udiseCode = params.udise ?? '';
  const schoolName = params.name ?? udiseCode;

  const [load, setLoad] = useState<LoadState>({ kind: 'loading' });
  const [answers, setAnswers] = useState<FormAnswers>({});
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [reloading, setReloading] = useState(false);
  const [reloadNonce, setReloadNonce] = useState(0);
  const [now, setNow] = useState(() => new Date());

  // The stamp preview is a clock, not a snapshot, so it ticks while the form
  // is open. The value actually sent is still taken inside submit().
  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 30_000);
    return () => clearInterval(timer);
  }, []);

  // The questionnaire is loaded by an effect rather than by calling straight
  // from render, so the answers the user has already typed survive a refresh
  // and a slow answer can never set state on an unmounted screen.
  useEffect(() => {
    let cancelled = false;

    (async () => {
      const resolution = await resolveQuestionnaire({ isOnline });

      if (cancelled) return;
      setReloading(false);

      if (resolution.status === 'ready') {
        setLoad({ kind: 'ready', questionnaire: resolution.questionnaire, source: resolution.source });
        setAnswers((previous) =>
          Object.keys(previous).length > 0 ? previous : emptyFormAnswers(resolution.questionnaire)
        );
        return;
      }

      if (resolution.status === 'stale') {
        setLoad({
          kind: 'stale',
          message: describeStaleQuestionnaire(resolution.cached, istYearMonth()),
        });
        return;
      }

      setLoad({ kind: 'unavailable', message: resolution.message });
    })();

    return () => {
      cancelled = true;
    };
  }, [isOnline, reloadNonce]);

  /** Runs on the "Try again" button, never during render. */
  const reload = useCallback(() => {
    setReloading(true);
    setLoad({ kind: 'loading' });
    setReloadNonce((value) => value + 1);
  }, []);

  const setAnswer = (questionId: string, value: boolean | string | null) => {
    setAnswers((previous) => ({ ...previous, [questionId]: value }));
    setErrors((previous) => {
      if (!previous[questionId]) return previous;
      const next = { ...previous };
      delete next[questionId];
      return next;
    });
  };

  /**
   * The moment Submit is tapped is what gets recorded, not when the form was
   * opened - the brief is explicit about this, and it is what makes an
   * afternoon of fieldwork show the right times.
   */
  const submit = async () => {
    if (load.kind !== 'ready' || !user) return;

    const details = validateForm(load.questionnaire, answers);
    if (details.length > 0) {
      setErrors(Object.fromEntries(details.map((detail) => [detail.field, detail.message])));
      return;
    }

    setSubmitting(true);
    setErrors({});

    const visitedAt = new Date().toISOString();

    await enqueue({
      clientId: newClientId(),
      userId: user.userId,
      udiseCode,
      schoolName,
      visitedAt,
      answers: toAnswers(load.questionnaire, answers),
    });

    setSubmitting(false);
    router.replace('/visits');
  };

  const stale = load.kind === 'stale';

  return (
    <Screen style={styles.screen}>
      <Stack.Screen
        options={{
          headerRight: () => <HeaderLink href="/visits" label="My visits" />,
        }}
      />

      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 88 : 0}
      >
        {load.kind === 'loading' ? (
          <StateView kind="loading" title="Loading this month's questions" />
        ) : stale ? (
          <StateView
            kind="info"
            title="Go online to get this month's questions"
            message={load.message}
            actionLabel="Try again"
            onAction={reload}
          />
        ) : load.kind === 'unavailable' ? (
          <StateView
            kind="info"
            title="Questions not downloaded"
            message={load.message}
            actionLabel="Try again"
            onAction={reload}
          />
        ) : (
          <ScrollView
            contentContainerStyle={styles.scroll}
            keyboardShouldPersistTaps="handled"
            keyboardDismissMode="on-drag"
          >
            <View style={styles.schoolCard}>
              <Text style={styles.schoolName}>{schoolName}</Text>
              <Text style={styles.schoolMeta}>UDISE {udiseCode}</Text>
            </View>

            <View style={styles.titleRow}>
              <View style={styles.flexShrink}>
                <Text style={styles.formTitle}>{load.questionnaire.title}</Text>
                <Text style={styles.formMeta}>
                  {monthLabel(load.questionnaire)} ·{' '}
                  {load.source === 'cache' ? 'from this phone' : 'downloaded'}
                </Text>
              </View>
            </View>

            {!isOnline ? (
              <Banner
                tone="info"
                message="You are offline. Submitting saves the visit on this phone first; it will be sent when the network returns."
              />
            ) : null}

            {reloading ? (
              <Text style={styles.stamp}>Refreshing the questionnaire…</Text>
            ) : null}

            {load.questionnaire.questions.map((question, index) => (
              <QuestionBlock
                key={question.questionId}
                index={index + 1}
                text={question.text}
                hint={hintFor(question)}
                optional={question.optional === true}
                error={errors[`answers.${question.questionId}`]}
              >
                <QuestionInput
                  question={question}
                  value={answers[question.questionId] ?? null}
                  onChange={(value) => setAnswer(question.questionId, value)}
                />
              </QuestionBlock>
            ))}

            <View style={styles.submitBlock}>
              <Text style={styles.stamp}>
                visitedAt will be recorded as {formatIstTimestamp(now)} IST
              </Text>
              <Button
                label="Submit visit"
                onPress={() => void submit()}
                busy={submitting}
                disabled={!user}
              />
              <Text style={styles.footnote}>
                Saved to this phone first, then sent. Tapping Submit again is safe: the same visit
                is never stored twice on the server.
              </Text>
            </View>
          </ScrollView>
        )}
      </KeyboardAvoidingView>
    </Screen>
  );
}

function QuestionInput({
  question,
  value,
  onChange,
}: {
  question: Question;
  value: boolean | string | null;
  onChange: (value: boolean | string) => void;
}) {
  switch (question.type) {
    case 'yesNo':
      return (
        <YesNoInput
          value={typeof value === 'boolean' ? value : null}
          onChange={(next) => onChange(next)}
        />
      );
    case 'number':
      return (
        <NumberAnswerInput
          value={typeof value === 'string' ? value : ''}
          onChange={(next) => onChange(next.replace(/[^0-9]/g, ''))}
        />
      );
    case 'singleChoice':
      return (
        <OptionInput
          options={question.options ?? []}
          value={typeof value === 'string' ? value : null}
          onChange={(next) => onChange(next)}
        />
      );
    case 'text':
    default:
      return (
        <TextAnswerInput
          value={typeof value === 'string' ? value : ''}
          onChangeValue={(next) => onChange(next)}
          maxLength={question.maxLength ?? null}
          multiline
          placeholder="Type your remarks"
        />
      );
  }
}

function hintFor(question: Question): string | null {
  if (question.type === 'number') {
    const range = rangeHint(question);
    return range ? `Whole number, ${range}` : 'Whole number';
  }
  return null;
}

const styles = StyleSheet.create({
  screen: { paddingHorizontal: 0 },
  flex: { flex: 1 },
  flexShrink: { flexShrink: 1 },
  scroll: { padding: spacing.lg, paddingBottom: spacing.xxl * 2, gap: spacing.xl },
  schoolCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.lg,
    gap: 2,
  },
  schoolName: { ...typography.heading, color: colors.text },
  schoolMeta: { ...typography.caption, color: colors.textMuted, fontVariant: ['tabular-nums'] },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  formTitle: { ...typography.heading, color: colors.text },
  formMeta: { ...typography.caption, color: colors.textMuted, marginTop: 2 },
  submitBlock: { gap: spacing.md, marginTop: spacing.sm },
  stamp: { ...typography.caption, color: colors.textMuted },
  footnote: { ...typography.caption, color: colors.textFaint, lineHeight: 17 },
});
