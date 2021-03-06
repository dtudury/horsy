/* global atob */
import { h, after } from '/unpkg/horseless/horseless.js'
import { model, setKey } from '../model.js'
import { ERROR, MAIN, WORKING, REPO_SELECT, DECRYPT } from '../constants.js'
import { db } from '../db.js'
import { iconRepo, iconLock, iconKey } from '../icons.js'
import { header } from './lineBuilder.js'

const encoder = new TextEncoder()
const decoder = new TextDecoder()
const b64ToUi8 = b64 => new Uint8Array(atob(b64).split('').map(c => c.charCodeAt(0)))

const decryptRepo = el => async e => {
  e.preventDefault()
  const data = new window.FormData(el)
  el.reset()

  model.page = WORKING
  const keyMaterial = await window.crypto.subtle.importKey(
    'raw',
    encoder.encode(data.get('passphrase')),
    { name: 'PBKDF2' }, false, ['deriveKey']
  )
  data.delete('passphrase')

  Object.assign(db().transaction(['repos']).objectStore('repos').get(model.name), {
    onsuccess: async e => {
      try {
        const result = new Uint8Array(e.target.result)
        const i = result.indexOf(0)
        const cleartext = JSON.parse(decoder.decode(result.subarray(0, i)))
        const key = await window.crypto.subtle.deriveKey({
          name: 'PBKDF2',
          salt: encoder.encode(cleartext.salt),
          iterations: cleartext.iterations,
          hash: 'SHA-256'
        }, keyMaterial, { name: 'AES-GCM', length: 256 }, false, ['encrypt', 'decrypt'])
        const ciphertext = result.subarray(i + 1)
        model.files = JSON.parse(
          decoder.decode(
            await window.crypto.subtle.decrypt({ name: 'AES-GCM', iv: b64ToUi8(cleartext.iv) }, key, ciphertext)
          )
        )
        model.iterations = cleartext.iterations
        model.salt = cleartext.salt
        setKey(key)
        model.page = MAIN
      } catch (e) {
        console.error(e)
        model.errorName = 'Decryption Error'
        model.errorMessage = 'Unable to decrypt repository'
        model.page = ERROR
      }
    },
    onerror: e => {
      console.error('error', e)
      model.error = e
      model.page = ERROR
    }
  })
}

function autofocus (el) {
  if (el && model.page === DECRYPT) {
    after(() => el.focus())
  }
  return 'autofocus'
}

export const repoDecrypt = h`
  ${header('Open Repository', iconRepo, 'h2', el => e => { model.page = REPO_SELECT })}
  <div class="nesting">
    <div class="nested">
      <div class="bracket" style="left: 16px; z-index: 1;"></div>
        <div class="nesting">
          <h3 class="line">${iconLock}<span>Decrypt Repository: ${() => model.name}</span></h3>

            <form class="nested" onsubmit=${decryptRepo}>
              <div class="bracket" style="left: 21px;"></div>
              <div class="line">
                ${iconKey}
                <span class="narrow"><label for="passphrase">Passphrase:</label></span>
                <input type="password" id="passphrase" name="passphrase" ${autofocus} required>
              </div>
              <div class="line">
                <span></span>
                <input type="submit" value="OPEN">
              </div>
            </form>

        </div>
      </div>
    </div>
  </div>
`
