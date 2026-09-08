/**
 * Material name → lucide name, for the icons the v1 screens need (MOB-014).
 *
 * The web client draws from `@mui/icons-material`, which has no React Native
 * build. The mobile client draws from `lucide-react-native`. That is two icon
 * sets for one product, which is a real cost — so this file is the seam, and it
 * is data rather than a pile of imports scattered across components.
 *
 * The rule that makes it work: **a shared module never returns a component.**
 * `cardTypes` and `useNextSteps` hand out an icon KEY (MOB-003B), and each
 * client maps that key to its own set. This table is the wider version of the
 * same idea, for the icons the web names directly.
 *
 * Every target here is verified against lucide's own exports by
 * `iconMap.test.js`. A name that does not exist fails a test rather than
 * rendering nothing on a device.
 *
 * Where a Material icon has no clean lucide equivalent it is listed in
 * `NEEDS_A_DECISION` below rather than silently swapped for something close.
 * A wrong icon is worse than a missing one: it teaches the wrong thing quietly.
 */

export const MATERIAL_TO_LUCIDE = {
  // Navigation and direction
  ArrowBackRounded: 'ArrowLeft',
  ArrowForwardRounded: 'ArrowRight',
  ArrowUpwardRounded: 'ArrowUp',
  ArrowDownwardRounded: 'ArrowDown',
  ArrowOutwardRounded: 'ArrowUpRight',
  ChevronLeftRounded: 'ChevronLeft',
  ChevronRightRounded: 'ChevronRight',
  ExpandLessRounded: 'ChevronUp',
  ExpandMoreRounded: 'ChevronDown',
  KeyboardArrowDown: 'ChevronDown',
  MenuRounded: 'Menu',
  MoreVert: 'EllipsisVertical',
  MoreVertRounded: 'EllipsisVertical',

  // Actions
  AddRounded: 'Plus',
  RemoveRounded: 'Minus',
  CheckRounded: 'Check',
  CloseRounded: 'X',
  Edit: 'Pencil',
  EditRounded: 'Pencil',
  Delete: 'Trash',
  DeleteRounded: 'Trash',
  DeleteForeverRounded: 'Trash',
  ArchiveRounded: 'Archive',
  SearchRounded: 'Search',
  SettingsRounded: 'Settings',
  Tune: 'SlidersHorizontal',
  TuneRounded: 'SlidersHorizontal',
  Logout: 'LogOut',
  RepeatRounded: 'Repeat',
  PlayArrowRounded: 'Play',
  FileDownloadRounded: 'Download',
  FileUploadRounded: 'Upload',
  CloudUploadRounded: 'CloudUpload',
  DriveFileMoveRounded: 'FolderInput',
  CallMergeRounded: 'Merge',

  // State and feedback
  CheckCircleRounded: 'CircleCheck',
  CheckCircleOutline: 'CircleCheck',
  CheckCircleOutlineRounded: 'CircleCheck',
  RadioButtonUncheckedRounded: 'Circle',
  ErrorOutlineRounded: 'CircleAlert',
  WarningRounded: 'TriangleAlert',
  WarningAmberRounded: 'TriangleAlert',
  InfoOutlined: 'Info',
  VerifiedRounded: 'BadgeCheck',
  LockRounded: 'Lock',

  // Content and domain
  BookRounded: 'Book',
  MenuBookRounded: 'BookOpen',
  LibraryAddRounded: 'BookPlus',
  CollectionsBookmarkRounded: 'Library',
  Bookmark: 'Bookmark',
  BookmarkRounded: 'Bookmark',
  BookmarkBorder: 'Bookmark',
  NoteAddRounded: 'FilePlus',
  Image: 'Image',
  Style: 'Layers',
  StyleRounded: 'Layers',
  Quiz: 'CircleQuestionMark',
  QuizRounded: 'CircleQuestionMark',
  SchoolRounded: 'GraduationCap',
  PsychologyRounded: 'Brain',
  AutoAwesomeRounded: 'Sparkles',
  RocketLaunchRounded: 'Rocket',
  LocalFireDepartmentRounded: 'Flame',
  LocalOfferRounded: 'Tag',
  FlagRounded: 'Flag',
  CalendarMonthRounded: 'Calendar',
  EventNoteRounded: 'CalendarDays',
  LanguageRounded: 'Languages',
  PublicRounded: 'Globe',
  AccountTreeRounded: 'Network',
  GridViewRounded: 'LayoutGrid',
  ViewListRounded: 'List',
  FormatListBulleted: 'List',
  RateReviewRounded: 'MessageSquareText',

  // Time of day
  WbSunny: 'Sun',
  WbTwilight: 'Sunset',
  NightsStay: 'Moon'
}

/**
 * Material icons with no clean lucide equivalent.
 *
 * Listed, not substituted. A wrong icon teaches the wrong thing quietly, and
 * the right answer is usually a design decision rather than a lookup — so these
 * wait for one instead of being guessed at here.
 */
export const NEEDS_A_DECISION = {
  LabelOffRounded:
    'Used for "untagged" (ADR-023). lucide has Tag but no TagOff; candidates are TagOff-by-composition, Ban, or dropping the icon and keeping the word.'
}

/**
 * The tab bar's icons (MOB-015). These have no Material counterpart in the web
 * app — its navigation is a header, not a tab bar — so they are named directly
 * rather than mapped.
 */
export const NAV_ICONS = {
  home: 'House',
  study: 'GraduationCap',
  focus: 'Timer',
  profile: 'CircleUser'
}

/** The icon keys the shared modules hand out (MOB-003B), resolved for mobile. */
export const KEY_TO_LUCIDE = {
  // from cardTypes
  cards: 'Layers',
  quiz: 'CircleQuestionMark',
  image: 'Image',
  // from useNextSteps
  study: 'GraduationCap',
  book: 'BookOpen',
  plan: 'Flag'
}

export const MATERIAL_NAMES = Object.keys(MATERIAL_TO_LUCIDE)
