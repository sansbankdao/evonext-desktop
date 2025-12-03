// src/libs/getMnemonic.ts

/* Import modules. */
import { invoke } from '@tauri-apps/api/core'
import { ILicense }  from '@/types'

export default async (): Promise<string> => {
    /* Request license. */
    const licenseStore = await invoke<ILicense | null>('load_license')

    /* Validate license store. */
    if (typeof licenseStore !== 'undefined' && licenseStore !== null) {
        return licenseStore.license_id
    } else {
        return ''
    }
}
