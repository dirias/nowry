/**
 * The icons this app actually draws, each imported from its own module.
 *
 * Generated from `iconMap.js` — do not hand-edit; `iconRegistry.test.js`
 * fails if the two drift apart.
 *
 * **Why per-icon paths.** Measured, not assumed. `import * as Lucide` took the
 * bundle from 4.8MB to 6.9MB, shipping all 1818 lucide icons for the sixty this
 * product uses. Named imports from the package root did not help either: Metro
 * resolves lucide's single ESM bundle and does not tree-shake it. Importing each
 * icon from `lucide-react-native/icons/<name>` is what actually pays — 5.0MB.
 *
 * **Why DEFAULT imports.** Each per-icon module ends with
 * `export { House as default }` and exports no named binding. A named import
 * compiles, bundles, and yields `undefined` at runtime — every icon silently
 * missing until the first one renders. That shipped once; the registry test now
 * reads the package to prove the shape.
 */
import Archive from 'lucide-react-native/icons/archive'
import ArrowDown from 'lucide-react-native/icons/arrow-down'
import ArrowLeft from 'lucide-react-native/icons/arrow-left'
import ArrowRight from 'lucide-react-native/icons/arrow-right'
import ArrowUp from 'lucide-react-native/icons/arrow-up'
import ArrowUpRight from 'lucide-react-native/icons/arrow-up-right'
import BadgeCheck from 'lucide-react-native/icons/badge-check'
import Book from 'lucide-react-native/icons/book'
import BookOpen from 'lucide-react-native/icons/book-open'
import BookPlus from 'lucide-react-native/icons/book-plus'
import Bookmark from 'lucide-react-native/icons/bookmark'
import Brain from 'lucide-react-native/icons/brain'
import Calendar from 'lucide-react-native/icons/calendar'
import CalendarDays from 'lucide-react-native/icons/calendar-days'
import Check from 'lucide-react-native/icons/check'
import ChevronDown from 'lucide-react-native/icons/chevron-down'
import ChevronLeft from 'lucide-react-native/icons/chevron-left'
import ChevronRight from 'lucide-react-native/icons/chevron-right'
import ChevronUp from 'lucide-react-native/icons/chevron-up'
import Circle from 'lucide-react-native/icons/circle'
import Clock from 'lucide-react-native/icons/clock'
import CircleAlert from 'lucide-react-native/icons/circle-alert'
import CircleCheck from 'lucide-react-native/icons/circle-check'
import CircleQuestionMark from 'lucide-react-native/icons/circle-question-mark'
import CloudUpload from 'lucide-react-native/icons/cloud-upload'
import Diamond from 'lucide-react-native/icons/diamond'
import Crown from 'lucide-react-native/icons/crown'
import Download from 'lucide-react-native/icons/download'
import EllipsisVertical from 'lucide-react-native/icons/ellipsis-vertical'
import FilePlus from 'lucide-react-native/icons/file-plus'
import Flag from 'lucide-react-native/icons/flag'
import Flame from 'lucide-react-native/icons/flame'
import FolderInput from 'lucide-react-native/icons/folder-input'
import Globe from 'lucide-react-native/icons/globe'
import GraduationCap from 'lucide-react-native/icons/graduation-cap'
import House from 'lucide-react-native/icons/house'
import Image from 'lucide-react-native/icons/image'
import Info from 'lucide-react-native/icons/info'
import Languages from 'lucide-react-native/icons/languages'
import Layers from 'lucide-react-native/icons/layers'
import Leaf from 'lucide-react-native/icons/leaf'
import LayoutGrid from 'lucide-react-native/icons/layout-grid'
import Library from 'lucide-react-native/icons/library'
import List from 'lucide-react-native/icons/list'
import Lock from 'lucide-react-native/icons/lock'
import LogOut from 'lucide-react-native/icons/log-out'
import Menu from 'lucide-react-native/icons/menu'
import Merge from 'lucide-react-native/icons/merge'
import MessageSquareText from 'lucide-react-native/icons/message-square-text'
import Minus from 'lucide-react-native/icons/minus'
import Moon from 'lucide-react-native/icons/moon'
import Network from 'lucide-react-native/icons/network'
import Pencil from 'lucide-react-native/icons/pencil'
import Play from 'lucide-react-native/icons/play'
import Plus from 'lucide-react-native/icons/plus'
import Repeat from 'lucide-react-native/icons/repeat'
import Rocket from 'lucide-react-native/icons/rocket'
import Search from 'lucide-react-native/icons/search'
import Settings from 'lucide-react-native/icons/settings'
import SlidersHorizontal from 'lucide-react-native/icons/sliders-horizontal'
import Sparkles from 'lucide-react-native/icons/sparkles'
import Star from 'lucide-react-native/icons/star'
import Sun from 'lucide-react-native/icons/sun'
import Sunset from 'lucide-react-native/icons/sunset'
import Tag from 'lucide-react-native/icons/tag'
import Target from 'lucide-react-native/icons/target'
import Timer from 'lucide-react-native/icons/timer'
import Trash from 'lucide-react-native/icons/trash'
import TriangleAlert from 'lucide-react-native/icons/triangle-alert'
import Upload from 'lucide-react-native/icons/upload'
import X from 'lucide-react-native/icons/x'

export const ICONS = {
  Archive,
  ArrowDown,
  ArrowLeft,
  ArrowRight,
  ArrowUp,
  ArrowUpRight,
  BadgeCheck,
  Book,
  BookOpen,
  BookPlus,
  Bookmark,
  Brain,
  Calendar,
  CalendarDays,
  Check,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ChevronUp,
  Circle,
  CircleAlert,
  CircleCheck,
  CircleQuestionMark,
  Clock,
  CloudUpload,
  Crown,
  Diamond,
  Download,
  EllipsisVertical,
  FilePlus,
  Flag,
  Flame,
  FolderInput,
  Globe,
  GraduationCap,
  House,
  Image,
  Info,
  Languages,
  Layers,
  Leaf,
  LayoutGrid,
  Library,
  List,
  Lock,
  LogOut,
  Menu,
  Merge,
  MessageSquareText,
  Minus,
  Moon,
  Network,
  Pencil,
  Play,
  Plus,
  Repeat,
  Rocket,
  Search,
  Settings,
  SlidersHorizontal,
  Sparkles,
  Star,
  Sun,
  Sunset,
  Tag,
  Target,
  Timer,
  Trash,
  TriangleAlert,
  Upload,
  X
}

export const ICON_NAMES = Object.keys(ICONS)

export default ICONS
