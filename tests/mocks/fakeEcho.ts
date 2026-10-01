/**
 * In-memory stand-in for a Laravel Echo instance, for components/hooks that
 * subscribe through src/lib/realtime/echo. Lets a test push a broadcast
 * ("the server sent X") and flip the socket's connection state.
 */
type Callback = (payload: any) => void

const NOTIFICATION_EVENT = '.Illuminate\\Notifications\\Events\\BroadcastNotificationCreated'

export function createFakeEcho(initialState = 'connected') {
  const listeners = new Map<string, Map<string, Set<Callback>>>()
  const stateHandlers = new Set<Callback>()

  const on = (channel: string, event: string) => {
    if (!listeners.has(channel)) listeners.set(channel, new Map())
    const events = listeners.get(channel)!
    if (!events.has(event)) events.set(event, new Set())
    return events.get(event)!
  }

  const connection = {
    state: initialState,
    bind: (event: string, cb: Callback) => {
      if (event === 'state_change') stateHandlers.add(cb)
    },
    unbind: (event: string, cb: Callback) => {
      if (event === 'state_change') stateHandlers.delete(cb)
    },
  }

  const privateChannel = (name: string) => {
    const channel = {
      listen: (event: string, cb: Callback) => {
        on(name, event).add(cb)
        return channel
      },
      stopListening: (event: string, cb?: Callback) => {
        if (cb) on(name, event).delete(cb)
        else on(name, event).clear()
        return channel
      },
      notification: (cb: Callback) => channel.listen(NOTIFICATION_EVENT, cb),
      stopListeningForNotification: (cb: Callback) => channel.stopListening(NOTIFICATION_EVENT, cb),
    }
    return channel
  }

  const echo = {
    private: privateChannel,
    leave: () => {},
    disconnect: () => {},
    connector: { pusher: { connection } },
  }

  return {
    echo,
    /** Number of active listeners for an event on a channel. */
    listenerCount: (channel: string, event: string) => on(channel, event).size,
    emit: (channel: string, event: string, payload: unknown) => {
      on(channel, event).forEach((cb) => cb(payload))
    },
    emitNotification: (channel: string, payload: unknown) => {
      on(channel, NOTIFICATION_EVENT).forEach((cb) => cb(payload))
    },
    setConnectionState: (current: string) => {
      const previous = connection.state
      connection.state = current
      stateHandlers.forEach((cb) => cb({ previous, current }))
    },
  }
}

export type FakeEcho = ReturnType<typeof createFakeEcho>
