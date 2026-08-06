// The first screen anyone sees. Styled with the components in
// src/components/ui/ and the tokens in src/global.css, so it follows the colour
// scheme without a single conditional.
//
// On the copy: this is a journal for people being treated for cancer. It stays
// plain and unhurried, promises only what the app actually does, and says out
// loud that it is not medical advice. Nothing here claims the entries are
// private or encrypted, because the API behind them makes no such guarantee
// yet - if that changes, that is the point to say so.

import { Link } from 'expo-router';
import type { LucideIcon } from 'lucide-react-native';
// One icon per import, not `from 'lucide-react-native'`. Metro does not
// tree-shake, so pulling three icons off the barrel drags all ~1500 into the
// bundle - worth 2MB of the 3.6MB app when this was first written.
import Clock from 'lucide-react-native/icons/clock';
import ListChecks from 'lucide-react-native/icons/list-checks';
import NotebookPen from 'lucide-react-native/icons/notebook-pen';
import { ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Icon } from '@/components/ui/icon';
import { Text } from '@/components/ui/text';
import { BottomTabInset, Spacing, WebHeaderInset } from '@/constants/theme';

const REASSURANCES: { icon: LucideIcon; title: string; body: string }[] = [
  {
    icon: NotebookPen,
    title: 'Whatever you need to say',
    body: 'Good days, hard days, and the ones in between.',
  },
  {
    icon: ListChecks,
    title: 'Ready for the next appointment',
    body: 'Keep your questions and notes in one place.',
  },
  {
    icon: Clock,
    title: 'No streaks to keep up',
    body: 'Write when you feel like it. Skip when you do not.',
  },
];

function Reassurance({ icon, title, body }: { icon: LucideIcon; title: string; body: string }) {
  return (
    <View className="flex-row gap-4">
      <View className="bg-accent size-10 shrink-0 items-center justify-center rounded-full">
        <Icon as={icon} size={18} className="text-accent-foreground" />
      </View>
      <View className="flex-1 gap-1">
        <Text className="font-semibold">{title}</Text>
        <Text variant="muted">{body}</Text>
      </View>
    </View>
  );
}

export default function LandingScreen() {
  const insets = useSafeAreaInsets();

  return (
    <ScrollView
      className="bg-background flex-1"
      contentContainerStyle={{
        // WebHeaderInset for the floating header on web, insets.top for the
        // status bar on a phone. Each is zero where the other applies.
        paddingTop: insets.top + WebHeaderInset + Spacing.five,
        paddingBottom: insets.bottom + BottomTabInset + Spacing.five,
      }}>
      {/* items-center centres the hero on the cross axis, which is why the card
          and the buttons below need w-full - otherwise they shrink to their
          content. */}
      <View className="w-full max-w-lg items-center gap-6 self-center px-6">
        <View className="items-center gap-4">
          <View className="bg-primary size-14 items-center justify-center rounded-2xl">
            <Icon as={NotebookPen} size={26} className="text-primary-foreground" />
          </View>

          <View className="items-center gap-2">
            <Text variant="small" className="text-muted-foreground uppercase tracking-widest">
              Along With You
            </Text>
            {/* variant h1 for the heading role and aria-level; the classes walk
                back its extra-bold weight, which reads louder than this screen
                wants to be. */}
            <Text variant="h1" className="text-3xl font-semibold leading-9">
              A quiet place for your own words.
            </Text>
            <Text variant="lead" className="text-center text-lg leading-7">
              Write down how you are feeling, what your care team said, and what you want to ask
              next time.
            </Text>
          </View>
        </View>

        <Card className="w-full py-5">
          <CardContent className="gap-5">
            {REASSURANCES.map((item) => (
              <Reassurance key={item.title} {...item} />
            ))}
          </CardContent>
        </Card>

        <View className="w-full gap-2">
          {/* /tasks is the placeholder resource the README describes - it is
              where journal entries will live once Task is replaced. */}
          <Link href="/tasks" asChild>
            <Button size="lg">
              <Text>Start your journal</Text>
            </Button>
          </Link>
          <Link href="/explore" asChild>
            <Button size="lg" variant="ghost">
              <Text>Look around first</Text>
            </Button>
          </Link>
        </View>

        <Text variant="muted" className="w-full text-center">
          A journal, not medical advice. Your care team is always the place for that.
        </Text>
      </View>
    </ScrollView>
  );
}
