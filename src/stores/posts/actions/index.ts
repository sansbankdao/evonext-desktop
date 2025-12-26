// src/stores/posts/actions/index.ts

import * as fetchActions from './fetch'
import * as createUpdateActions from './createUpdate'
import * as interactionActions from './interactions'
import * as utilityActions from './utilities'

export default {
    ...fetchActions,
    ...createUpdateActions,
    ...interactionActions,
    ...utilityActions
}
