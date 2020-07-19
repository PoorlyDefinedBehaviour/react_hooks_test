type Producer<T> = () => T

type BasicStateAction<S> = (value: S) => S | S

type Dispatch<A> = (value: A) => void

type Update<A> = {
  action: A
  next: Update<A> | null
}

type UpdateQueue<A> = {
  last: Update<A> | null
  dispatch: any
}

type Hook = {
  memoizedState: any
  queue: UpdateQueue<any> | null
  next: Hook | null
}

let firstWorkInProgressHook: Hook | null = null
let workInProgressHook: Hook | null = null
let isReRender: boolean = false
let renderPhaseUpdates: Map<UpdateQueue<any>, Update<any>> | null = null

const createHook = (): Hook => ({
  memoizedState: null,
  queue: null,
  next: null,
})

const createWorkInProgressHook = (): Hook => {
  if (!workInProgressHook) {
    if (!firstWorkInProgressHook) {
      isReRender = false
      firstWorkInProgressHook = createHook()
      workInProgressHook = firstWorkInProgressHook
    } else {
      isReRender = true
      workInProgressHook = firstWorkInProgressHook
    }
  } else if (!workInProgressHook.next) {
    isReRender = false
    workInProgressHook.next = createHook()
    workInProgressHook = workInProgressHook.next
  } else {
    isReRender = true
    workInProgressHook = workInProgressHook.next
  }

  return workInProgressHook
}

const dispatchAction = <A>(
  _componentIdentity: object,
  queue: UpdateQueue<A>,
  action: A
) => {
  const update: Update<A> = {
    action,
    next: null,
  }
  if (!renderPhaseUpdates) {
    renderPhaseUpdates = new Map()
  }

  const firstRenderPhaseUpdate = renderPhaseUpdates.get(queue)
  if (!firstRenderPhaseUpdate) {
    renderPhaseUpdates.set(queue, update)
  } else {
    let lastRenderPhaseUpdate = firstRenderPhaseUpdate
    while (lastRenderPhaseUpdate.next) {
      lastRenderPhaseUpdate = lastRenderPhaseUpdate.next
    }
    lastRenderPhaseUpdate.next = update
  }
}

const useReducer = <S, I, A>(
  reducer: (state: S, action: A) => S,
  initialState: I
): [S, Dispatch<A>] => {
  workInProgressHook = createWorkInProgressHook()

  if (isReRender) {
    const { queue } = workInProgressHook as any
    const { dispatch } = queue as any

    let update = renderPhaseUpdates?.get(queue) as Update<A> | null

    if (!update) {
      return [workInProgressHook.memoizedState, dispatch]
    }

    // eslint-disable-next-line no-unused-expressions
    renderPhaseUpdates?.delete(queue)

    let newState = workInProgressHook.memoizedState

    do {
      newState = reducer(newState, update.action)
      update = update.next
    } while (update)

    workInProgressHook.memoizedState = newState
    return [newState, dispatch]
  }

  const state: S =
    typeof initialState === "function" ? initialState() : initialState

  workInProgressHook.memoizedState = state

  const queue = {
    last: null,
    dispatch: <A>(action: A) => dispatchAction({}, queue, action),
  }

  workInProgressHook.queue = queue

  return [workInProgressHook.memoizedState, queue.dispatch]
}

const basicStateReducer = <S>(state: S, action: BasicStateAction<S>): S =>
  typeof action === "function" ? action(state) : action

const useState = <S>(
  initialState: Producer<S> | S
): [S, Dispatch<BasicStateAction<S>>] =>
  useReducer(basicStateReducer, initialState)

const resetHooks = (): void => {
  // firstWorkInProgressHook = null
  workInProgressHook = null
}

const App = () => {
  const [value, setValue] = useState(10)

  console.log("value", value)
  setValue(previousValue => previousValue + 1)
}

App()
resetHooks()
App()
