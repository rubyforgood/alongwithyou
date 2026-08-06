// Covers the wiring the React Native Reusables components share rather than
// each component's own behaviour - that is the library's business, and the CLI
// replaces these files wholesale when they are updated. What is worth pinning
// down is that they still mount in this project: the NativeWind babel preset,
// the @rn-primitives entry in jest.config.js's transformIgnorePatterns and the
// `@/` alias all have to hold for that to happen, and each of them breaks in a
// way that is hard to read from the failure.
//
// Note there are no styles to assert on. NativeWind turns class names into
// styles inside Metro, and jest stubs the stylesheet out (see jest.config.js),
// so `className` arrives as a plain prop and `style` never gets set.

import { fireEvent, render, screen } from '@testing-library/react-native';
import { Info } from 'lucide-react-native';
import { useState } from 'react';
import { View } from 'react-native';

import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Icon } from '@/components/ui/icon';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';
import { Switch } from '@/components/ui/switch';
import { Text } from '@/components/ui/text';
import { Textarea } from '@/components/ui/textarea';

describe('reusables', () => {
  it('mounts every component that has been pulled in', async () => {
    // One tree rather than one test each: the point is that every
    // @rn-primitives package behind these resolves and renders.
    await render(
      <View>
        <Alert icon={Info}>
          <AlertTitle>Heads up</AlertTitle>
          <AlertDescription>Something worth reading.</AlertDescription>
        </Alert>
        <Avatar alt="Avatar">
          <AvatarFallback>
            <Text>AB</Text>
          </AvatarFallback>
        </Avatar>
        <Badge>
          <Text>New</Text>
        </Badge>
        <Button>
          <Text>Press me</Text>
        </Button>
        <Card>
          <CardHeader>
            <CardTitle>Card title</CardTitle>
            <CardDescription>Card description</CardDescription>
          </CardHeader>
          <CardContent>
            <Text>Card content</Text>
          </CardContent>
        </Card>
        <Checkbox checked={false} onCheckedChange={() => {}} />
        <Icon as={Info} />
        <Input placeholder="Input" />
        <Label>Label</Label>
        <Progress value={40} />
        <Separator />
        <Skeleton />
        <Switch checked={false} onCheckedChange={() => {}} />
        <Textarea placeholder="Textarea" />
      </View>
    );

    expect(screen.getByText('Heads up')).toBeTruthy();
    expect(screen.getByText('Card title')).toBeTruthy();
    expect(screen.getByPlaceholderText('Textarea')).toBeTruthy();
  });

  it('gives Button the button role and calls onPress', async () => {
    const onPress = jest.fn();
    await render(
      <Button onPress={onPress}>
        <Text>Save</Text>
      </Button>
    );

    await fireEvent.press(screen.getByRole('button', { name: 'Save' }));

    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it('puts the variant and any extra classes on className', async () => {
    await render(
      <Button testID="button" variant="destructive" className="mt-4">
        <Text>Delete</Text>
      </Button>
    );

    const className: string = screen.getByTestId('button').props.className;

    expect(className).toContain('bg-destructive');
    expect(className).toContain('mt-4');
  });

  it('drops the class a later one overrides, rather than keeping both', async () => {
    // What `cn` in src/lib/utils.ts buys: a className prop beats the
    // component's own default instead of the order deciding it.
    await render(
      <Button testID="button" className="rounded-full">
        <Text>Round</Text>
      </Button>
    );

    const className: string = screen.getByTestId('button').props.className;

    expect(className).toContain('rounded-full');
    expect(className).not.toContain('rounded-md');
  });

  it('drives Checkbox from its onCheckedChange handler', async () => {
    function Controlled() {
      const [checked, setChecked] = useState(false);
      return (
        <>
          <Checkbox testID="checkbox" checked={checked} onCheckedChange={setChecked} />
          <Text>{checked ? 'checked' : 'unchecked'}</Text>
        </>
      );
    }

    await render(<Controlled />);
    expect(screen.getByText('unchecked')).toBeTruthy();

    await fireEvent.press(screen.getByTestId('checkbox'));

    expect(screen.getByText('checked')).toBeTruthy();
  });
});
