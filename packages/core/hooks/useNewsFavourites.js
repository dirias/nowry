/**
 * The articles a reader kept, for both clients (MOB-076).
 *
 * Three behaviours travel together and all three are easy to lose in a second
 * copy, which is why this is a hook rather than something each carousel does
 * for itself:
 *
 *   - **A favourite stores the whole article, not a link.** The feed is a
 *     window on a live API: an article favourited today is gone from the feed
 *     tomorrow, so keeping only its url would leave a list of titles nobody can
 *     render. `favorite_news` holds url, title, description, image and category.
 *   - **Optimistic, with rollback.** A star has to answer instantly; a failed
 *     write puts the previous list back.
 *   - **The feed excludes what is already kept**, so an article is in one list
 *     or the other and never in both.
 *
 * The URL is the identity. The API has no id for an article and two feeds can
 * carry the same story under different titles.
 */
import { useCallback, useEffect, useState } from 'react'
import { userService } from '../api/services'

/** What is stored for an article, and nothing else. */
export const favouriteRecord = (article) => ({
  url: article?.url ?? '',
  title: article?.title ?? '',
  description: article?.description ?? '',
  urlToImage: article?.urlToImage ?? '',
  category: article?.category ?? ''
})

/** The feed minus what is already kept. */
export const unfavourited = (articles, favourites) => {
  const kept = new Set((favourites ?? []).map((favourite) => favourite?.url))
  return (articles ?? []).filter((article) => !kept.has(article?.url))
}

/**
 * @param {object} preferences - the profile's `preferences.general`
 */
export const useNewsFavourites = (preferences) => {
  const stored = preferences?.favorite_news
  const [favourites, setFavourites] = useState(stored ?? [])

  // Follow the profile, not just the mount: it arrives after the first render
  // and changes when another device writes it.
  useEffect(() => {
    setFavourites(stored ?? [])
  }, [stored])

  const isFavourite = useCallback((article) => favourites.some((favourite) => favourite.url === article?.url), [favourites])

  const toggle = useCallback(
    async (article) => {
      const previous = favourites
      const next = isFavourite(article)
        ? favourites.filter((favourite) => favourite.url !== article?.url)
        : [...favourites, favouriteRecord(article)]

      setFavourites(next)
      try {
        await userService.updateGeneralPreferences({ favorite_news: next })
      } catch {
        setFavourites(previous)
      }
    },
    [favourites, isFavourite]
  )

  return { favourites, isFavourite, toggle }
}

export default useNewsFavourites
