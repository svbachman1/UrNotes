/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Route, Switch } from 'wouter';
import { Layout } from './components/Layout';
import { RecordPage } from './pages/RecordPage';
import { NotesPage } from './pages/NotesPage';
import { CalendarPage } from './pages/CalendarPage';

const queryClient = new QueryClient();

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <Layout>
        <Switch>
          <Route path="/" component={RecordPage} />
          <Route path="/notes" component={NotesPage} />
          <Route path="/calendar" component={CalendarPage} />
        </Switch>
      </Layout>
    </QueryClientProvider>
  );
}
