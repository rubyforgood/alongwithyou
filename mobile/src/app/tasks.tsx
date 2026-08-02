import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, FlatList, Pressable, StyleSheet, TextInput } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { BottomTabInset, MaxContentWidth, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { API_BASE_URL, ApiError, Task, tasks } from '@/lib/api';

export default function TasksScreen() {
  const theme = useTheme();
  const insets = useSafeAreaInsets();

  const [items, setItems] = useState<Task[]>([]);
  const [title, setTitle] = useState('');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setError(null);
    try {
      setItems(await tasks.list());
    } catch (cause) {
      setError(cause instanceof ApiError ? cause.message : 'Something went wrong.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function addTask() {
    const trimmed = title.trim();
    if (!trimmed || submitting) return;

    setSubmitting(true);
    setError(null);
    try {
      const created = await tasks.create(trimmed);
      setItems((current) => [created, ...current]);
      setTitle('');
    } catch (cause) {
      setError(cause instanceof ApiError ? cause.message : 'Something went wrong.');
    } finally {
      setSubmitting(false);
    }
  }

  async function toggleTask(task: Task) {
    // Flip locally first so the tap feels instant, then reconcile with Rails.
    const optimistic = { ...task, completed: !task.completed };
    setItems((current) => current.map((item) => (item.id === task.id ? optimistic : item)));

    try {
      const saved = await tasks.update(task.id, { completed: optimistic.completed });
      setItems((current) => current.map((item) => (item.id === saved.id ? saved : item)));
    } catch (cause) {
      setItems((current) => current.map((item) => (item.id === task.id ? task : item)));
      setError(cause instanceof ApiError ? cause.message : 'Something went wrong.');
    }
  }

  async function removeTask(task: Task) {
    const previous = items;
    setItems((current) => current.filter((item) => item.id !== task.id));

    try {
      await tasks.destroy(task.id);
    } catch (cause) {
      setItems(previous);
      setError(cause instanceof ApiError ? cause.message : 'Something went wrong.');
    }
  }

  return (
    <ThemedView style={styles.container}>
      <ThemedView
        style={[
          styles.content,
          {
            paddingTop: insets.top + Spacing.three,
            paddingBottom: insets.bottom + BottomTabInset + Spacing.three,
          },
        ]}>
        <ThemedText type="subtitle">Tasks</ThemedText>
        <ThemedText type="small" themeColor="textSecondary">
          Served by Rails at {API_BASE_URL ?? 'an unconfigured URL'}
        </ThemedText>

        <ThemedView style={styles.composer}>
          <TextInput
            value={title}
            onChangeText={setTitle}
            onSubmitEditing={addTask}
            placeholder="Add a task"
            placeholderTextColor={theme.textSecondary}
            returnKeyType="done"
            editable={!submitting}
            style={[
              styles.input,
              { backgroundColor: theme.backgroundElement, color: theme.text },
            ]}
          />
          <Pressable
            onPress={addTask}
            disabled={submitting || !title.trim()}
            style={({ pressed }) => [
              styles.addButton,
              { backgroundColor: theme.backgroundSelected },
              (pressed || submitting || !title.trim()) && styles.dimmed,
            ]}>
            <ThemedText type="smallBold">Add</ThemedText>
          </Pressable>
        </ThemedView>

        {error && (
          <ThemedView type="backgroundElement" style={styles.errorBox}>
            <ThemedText type="small">{error}</ThemedText>
            <Pressable onPress={load}>
              <ThemedText type="linkPrimary">Retry</ThemedText>
            </Pressable>
          </ThemedView>
        )}

        {loading ? (
          <ActivityIndicator style={styles.loader} />
        ) : (
          <FlatList
            data={items}
            keyExtractor={(item) => String(item.id)}
            contentContainerStyle={styles.list}
            ListEmptyComponent={
              <ThemedText type="small" themeColor="textSecondary">
                No tasks yet. Add one above.
              </ThemedText>
            }
            renderItem={({ item }) => (
              <ThemedView type="backgroundElement" style={styles.row}>
                <Pressable
                  onPress={() => toggleTask(item)}
                  style={({ pressed }) => [styles.rowMain, pressed && styles.dimmed]}>
                  <ThemedText type="small">{item.completed ? '\u2713' : '\u25cb'}</ThemedText>
                  <ThemedText
                    style={[styles.rowTitle, item.completed && styles.completedTitle]}
                    themeColor={item.completed ? 'textSecondary' : 'text'}>
                    {item.title}
                  </ThemedText>
                </Pressable>
                <Pressable
                  onPress={() => removeTask(item)}
                  hitSlop={Spacing.two}
                  style={({ pressed }) => pressed && styles.dimmed}>
                  <ThemedText type="small" themeColor="textSecondary">
                    Delete
                  </ThemedText>
                </Pressable>
              </ThemedView>
            )}
          />
        )}
      </ThemedView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'center',
  },
  content: {
    flex: 1,
    width: '100%',
    maxWidth: MaxContentWidth,
    paddingHorizontal: Spacing.four,
    gap: Spacing.three,
  },
  composer: {
    flexDirection: 'row',
    gap: Spacing.two,
  },
  input: {
    flex: 1,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
    borderRadius: Spacing.three,
    fontSize: 16,
  },
  addButton: {
    justifyContent: 'center',
    paddingHorizontal: Spacing.four,
    borderRadius: Spacing.three,
  },
  errorBox: {
    padding: Spacing.three,
    borderRadius: Spacing.three,
    gap: Spacing.one,
  },
  loader: {
    marginTop: Spacing.four,
  },
  list: {
    gap: Spacing.two,
    paddingBottom: Spacing.three,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
    padding: Spacing.three,
    borderRadius: Spacing.three,
  },
  rowMain: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
  },
  rowTitle: {
    flex: 1,
  },
  completedTitle: {
    textDecorationLine: 'line-through',
  },
  dimmed: {
    opacity: 0.6,
  },
});
