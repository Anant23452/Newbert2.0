// Merged into PATTERNS on load — brings total to 200 questions
const EXTRA_QUESTIONS = {
  "sliding-window": [
    { name: "Max Consecutive Ones III", diff: "medium", lc: "https://leetcode.com/problems/max-consecutive-ones-iii/", hint: "<strong>Pattern:</strong> Variable window. Shrink left when count of zeros exceeds k. Track max window length." },
    { name: "Longest Repeating Character Replacement", diff: "medium", lc: "https://leetcode.com/problems/longest-repeating-character-replacement/", hint: "<strong>Pattern:</strong> Window valid if (windowLen - maxFreq) <= k. Expand right, shrink left when invalid." },
    { name: "Subarray Product Less Than K", diff: "medium", lc: "https://leetcode.com/problems/subarray-product-less-than-k/", hint: "<strong>Pattern:</strong> Expand right multiplying product; while product >= k, divide by nums[left++] and count subarrays ending at right." },
    { name: "Maximum Number of Vowels in a Substring of Given Length", diff: "medium", lc: "https://leetcode.com/problems/maximum-number-of-vowels-in-a-substring-of-given-length/", hint: "<strong>Pattern:</strong> Fixed window size k. Slide and maintain vowel count in O(1) per step." }
  ],
  "two-pointers": [
    { name: "Move Zeroes", diff: "easy", lc: "https://leetcode.com/problems/move-zeroes/", hint: "<strong>Pattern:</strong> Write pointer for next non-zero position. Swap or overwrite, then fill rest with zeros." },
    { name: "Remove Element", diff: "easy", lc: "https://leetcode.com/problems/remove-element/", hint: "<strong>Pattern:</strong> Slow pointer tracks write index; fast scans and copies elements != val." },
    { name: "Boats to Save People", diff: "medium", lc: "https://leetcode.com/problems/boats-to-save-people/", hint: "<strong>Pattern:</strong> Sort weights. Pair lightest with heaviest if sum <= limit; else heaviest alone. Two pointers inward." },
    { name: "3Sum Closest", diff: "medium", lc: "https://leetcode.com/problems/3sum-closest/", hint: "<strong>Pattern:</strong> Sort, fix i, two pointers on remainder. Update closest sum when |sum - target| improves." }
  ],
  "fast-slow": [
    { name: "Remove Duplicates from Sorted List", diff: "easy", lc: "https://leetcode.com/problems/remove-duplicates-from-sorted-list/", hint: "<strong>Pattern:</strong> Single pass: if curr.val == curr.next.val, skip next node; else advance." },
    { name: "Remove Duplicates from Sorted List II", diff: "medium", lc: "https://leetcode.com/problems/remove-duplicates-from-sorted-list-ii/", hint: "<strong>Pattern:</strong> Dummy head. Skip all nodes with duplicate values entirely." },
    { name: "Split Linked List in Parts", diff: "medium", lc: "https://leetcode.com/problems/split-linked-list-in-parts/", hint: "<strong>Pattern:</strong> Count length, compute base size and remainder; cut list into k parts." },
    { name: "Circular Array Loop", diff: "medium", lc: "https://leetcode.com/problems/circular-array-loop/", hint: "<strong>Pattern:</strong> Fast/slow on indices (not values). Detect cycle of length > 1 with same direction." },
    { name: "Linked List Random Node", diff: "medium", lc: "https://leetcode.com/problems/linked-list-random-node/", hint: "<strong>Pattern:</strong> Reservoir sampling: probability 1/n for nth node when traversing." },
    { name: "Insert into a Sorted Circular Linked List", diff: "medium", lc: "https://leetcode.com/problems/insert-into-a-sorted-circular-linked-list/", hint: "<strong>Pattern:</strong> Find insert point in circular sorted list; handle all-equal and wrap-around edge cases." }
  ],
  "binary-search": [
    { name: "Search Insert Position", diff: "easy", lc: "https://leetcode.com/problems/search-insert-position/", hint: "<strong>Pattern:</strong> Standard binary search; return lo when not found (insert position)." },
    { name: "First Bad Version", diff: "easy", lc: "https://leetcode.com/problems/first-bad-version/", hint: "<strong>Pattern:</strong> Binary search for first true in monotonic false→true array." },
    { name: "Find First and Last Position of Element in Sorted Array", diff: "medium", lc: "https://leetcode.com/problems/find-first-and-last-position-of-element-in-sorted-array/", hint: "<strong>Pattern:</strong> Two binary searches: leftmost and rightmost index of target." },
    { name: "Capacity To Ship Packages Within D Days", diff: "medium", lc: "https://leetcode.com/problems/capacity-to-ship-packages-within-d-days/", hint: "<strong>Pattern:</strong> Binary search on capacity. Greedily check if mid capacity ships all within D days." },
    { name: "Split Array Largest Sum", diff: "hard", lc: "https://leetcode.com/problems/split-array-largest-sum/", hint: "<strong>Pattern:</strong> Binary search on max subarray sum. Greedily count splits needed for mid limit." }
  ],
  "merge-intervals": [
    { name: "Summary Ranges", diff: "easy", lc: "https://leetcode.com/problems/summary-ranges/", hint: "<strong>Pattern:</strong> Scan sorted array; extend range while consecutive; format start→end." },
    { name: "Teemo Attacking", diff: "easy", lc: "https://leetcode.com/problems/teemo-attacking/", hint: "<strong>Pattern:</strong> Merge overlapping poison intervals; add duration minus overlap." },
    { name: "My Calendar I", diff: "medium", lc: "https://leetcode.com/problems/my-calendar-i/", hint: "<strong>Pattern:</strong> Store bookings; check no overlap before insert (binary search or sorted list)." },
    { name: "My Calendar II", diff: "medium", lc: "https://leetcode.com/problems/my-calendar-ii/", hint: "<strong>Pattern:</strong> Track single overlaps separately; allow at most double booking." },
    { name: "Range Module", diff: "hard", lc: "https://leetcode.com/problems/range-module/", hint: "<strong>Pattern:</strong> Merge interval list; add/remove ranges by splitting overlapping segments." },
    { name: "Data Stream as Disjoint Intervals", diff: "hard", lc: "https://leetcode.com/problems/data-stream-as-disjoint-intervals/", hint: "<strong>Pattern:</strong> Insert value into sorted intervals; merge if adjacent or overlapping." }
  ],
  "hashmap": [
    { name: "Ransom Note", diff: "easy", lc: "https://leetcode.com/problems/ransom-note/", hint: "<strong>Pattern:</strong> Frequency map of magazine chars; decrement for each ransom char." },
    { name: "First Unique Character in a String", diff: "easy", lc: "https://leetcode.com/problems/first-unique-character-in-a-string/", hint: "<strong>Pattern:</strong> Count frequencies, second pass for first index with count 1." },
    { name: "Top K Frequent Words", diff: "medium", lc: "https://leetcode.com/problems/top-k-frequent-words/", hint: "<strong>Pattern:</strong> Freq map + bucket sort or heap with tie-break lexicographic." },
    { name: "Find All Duplicates in an Array", diff: "medium", lc: "https://leetcode.com/problems/find-all-duplicates-in-an-array/", hint: "<strong>Pattern:</strong> Use index as hash: mark nums[abs(n)-1] negative; repeat visits = duplicate." },
    { name: "Continuous Subarray Sum", diff: "medium", lc: "https://leetcode.com/problems/continuous-subarray-sum/", hint: "<strong>Pattern:</strong> Prefix sum mod k in map; if same mod seen before with length >= 2, return true." }
  ],
  "tree-traversal": [
    { name: "Same Tree", diff: "easy", lc: "https://leetcode.com/problems/same-tree/", hint: "<strong>Pattern:</strong> DFS: both null → true; one null or val mismatch → false; recurse both sides." },
    { name: "Path Sum", diff: "easy", lc: "https://leetcode.com/problems/path-sum/", hint: "<strong>Pattern:</strong> DFS subtract node val from target; leaf with target 0 → true." }
  ],
  "dp": [
    { name: "Unique Paths", diff: "medium", lc: "https://leetcode.com/problems/unique-paths/", hint: "<strong>Pattern:</strong> dp[i][j] = dp[i-1][j] + dp[i][j-1]. Grid paths from top-left." },
    { name: "Minimum Path Sum", diff: "medium", lc: "https://leetcode.com/problems/minimum-path-sum/", hint: "<strong>Pattern:</strong> dp[i][j] = grid[i][j] + min(dp[i-1][j], dp[i][j-1]). Only right/down moves." }
  ],
  "backtracking": [
    { name: "Palindrome Partitioning", diff: "medium", lc: "https://leetcode.com/problems/palindrome-partitioning/", hint: "<strong>Pattern:</strong> Try every cut position; recurse on suffix if prefix is palindrome." },
    { name: "Restore IP Addresses", diff: "medium", lc: "https://leetcode.com/problems/restore-ip-addresses/", hint: "<strong>Pattern:</strong> Backtrack 4 segments; each segment 1–3 digits, no leading zero, value <= 255." },
    { name: "Combination Sum III", diff: "medium", lc: "https://leetcode.com/problems/combination-sum-iii/", hint: "<strong>Pattern:</strong> Choose k distinct numbers 1–9 summing to n; backtrack with start index." },
    { name: "Sudoku Solver", diff: "hard", lc: "https://leetcode.com/problems/sudoku-solver/", hint: "<strong>Pattern:</strong> Try digits 1–9 in empty cells; validate row/col/box; backtrack on failure." },
  ],
  "graph": [
    { name: "Flood Fill", diff: "easy", lc: "https://leetcode.com/problems/flood-fill/", hint: "<strong>Pattern:</strong> DFS/BFS from start pixel; recolor connected same-color cells." },
    { name: "All Paths From Source to Target", diff: "medium", lc: "https://leetcode.com/problems/all-paths-from-source-to-target/", hint: "<strong>Pattern:</strong> DAG DFS/backtrack from 0; push/pop path; collect when node == n-1." },
    { name: "Redundant Connection", diff: "medium", lc: "https://leetcode.com/problems/redundant-connection/", hint: "<strong>Pattern:</strong> Union-Find; first edge connecting already-connected nodes is redundant." },
    { name: "Accounts Merge", diff: "medium", lc: "https://leetcode.com/problems/accounts-merge/", hint: "<strong>Pattern:</strong> Union-Find on emails; group by root; map roots to names." }
  ],
  "heap": [
    { name: "Find K Pairs with Smallest Sums", diff: "medium", lc: "https://leetcode.com/problems/find-k-pairs-with-smallest-sums/", hint: "<strong>Pattern:</strong> Min-heap of (sum, i, j); push neighbors after popping k times." },
    { name: "Reorganize String", diff: "medium", lc: "https://leetcode.com/problems/reorganize-string/", hint: "<strong>Pattern:</strong> Max-heap by freq; always place most frequent not equal to previous." },
    { name: "Ugly Number II", diff: "medium", lc: "https://leetcode.com/problems/ugly-number-ii/", hint: "<strong>Pattern:</strong> Min-heap or three pointers for factors 2,3,5 sequence." },
    { name: "Smallest Range Covering Elements from K Lists", diff: "hard", lc: "https://leetcode.com/problems/smallest-range-covering-elements-from-k-lists/", hint: "<strong>Pattern:</strong> Min-heap with one element from each list; shrink range by advancing smallest." }
  ],
  "stack": [
    { name: "Decode String", diff: "medium", lc: "https://leetcode.com/problems/decode-string/", hint: "<strong>Pattern:</strong> Stack stores (string, repeat count). On ']' pop and repeat substring." },
    { name: "Simplify Path", diff: "medium", lc: "https://leetcode.com/problems/simplify-path/", hint: "<strong>Pattern:</strong> Stack of directory names; pop on '..', skip '.' and empty." },
    { name: "Removing Stars From a String", diff: "medium", lc: "https://leetcode.com/problems/removing-stars-from-a-string/", hint: "<strong>Pattern:</strong> Stack of chars; pop on '*', else push." },
    { name: "Next Greater Element I", diff: "easy", lc: "https://leetcode.com/problems/next-greater-element-i/", hint: "<strong>Pattern:</strong> Monotonic stack on nums2; map each value to next greater." },
    { name: "Online Stock Span", diff: "medium", lc: "https://leetcode.com/problems/online-stock-span/", hint: "<strong>Pattern:</strong> Monotonic decreasing stack of (price, span); pop while price <= current." }
  ],
  "trie": [
    { name: "Longest Common Prefix", diff: "easy", lc: "https://leetcode.com/problems/longest-common-prefix/", hint: "<strong>Pattern:</strong> Trie insert all words OR compare chars column by column." },
    { name: "Replace Words", diff: "medium", lc: "https://leetcode.com/problems/replace-words/", hint: "<strong>Pattern:</strong> Trie of roots; for each word walk until isEnd or fail." },
    { name: "Longest Word in Dictionary", diff: "medium", lc: "https://leetcode.com/problems/longest-word-in-dictionary/", hint: "<strong>Pattern:</strong> Trie; word valid only if every prefix is also a word (isEnd)." },
    { name: "Map Sum Pairs", diff: "medium", lc: "https://leetcode.com/problems/map-sum-pairs/", hint: "<strong>Pattern:</strong> Trie nodes store subtree sum; update on insert with delta." },
    { name: "Maximum XOR of Two Numbers in an Array", diff: "medium", lc: "https://leetcode.com/problems/maximum-xor-of-two-numbers-in-an-array/", hint: "<strong>Pattern:</strong> Binary Trie (0/1 children); maximize XOR bit by bit." },
    { name: "Short Encoding of Words", diff: "medium", lc: "https://leetcode.com/problems/short-encoding-of-words/", hint: "<strong>Pattern:</strong> Insert words reversed in Trie; count leaf nodes with '#' suffix." },
    { name: "Search Suggestions System", diff: "medium", lc: "https://leetcode.com/problems/search-suggestions-system/", hint: "<strong>Pattern:</strong> Trie with top-3 lex smallest words at each prefix node." }
  ],
  "greedy": [
    { name: "Best Time to Buy and Sell Stock", diff: "easy", lc: "https://leetcode.com/problems/best-time-to-buy-and-sell-stock/", hint: "<strong>Pattern:</strong> Track min price so far; max profit = max(price - minPrice)." },
    { name: "Best Time to Buy and Sell Stock II", diff: "medium", lc: "https://leetcode.com/problems/best-time-to-buy-and-sell-stock-ii/", hint: "<strong>Pattern:</strong> Greedy: add every upward day-to-day difference." },
    { name: "Lemonade Change", diff: "easy", lc: "https://leetcode.com/problems/lemonade-change/", hint: "<strong>Pattern:</strong> Greedy change: prefer giving $10+$5 over three $5s for $20." },
    { name: "Queue Reconstruction by Height", diff: "medium", lc: "https://leetcode.com/problems/queue-reconstruction-by-height/", hint: "<strong>Pattern:</strong> Sort by height desc, k asc; insert at index k in result list." },
    { name: "Candy", diff: "hard", lc: "https://leetcode.com/problems/candy/", hint: "<strong>Pattern:</strong> Two passes: left-to-right and right-to-left rating peaks." },
  ],
  "linked-list": [
    { name: "Intersection of Two Linked Lists", diff: "easy", lc: "https://leetcode.com/problems/intersection-of-two-linked-lists/", hint: "<strong>Pattern:</strong> Two pointers switch lists when reaching end; meet at intersection or null." },
    { name: "Odd Even Linked List", diff: "medium", lc: "https://leetcode.com/problems/odd-even-linked-list/", hint: "<strong>Pattern:</strong> Separate odd and even chains; connect even tail to odd head." },
    { name: "Delete Node in a Linked List", diff: "medium", lc: "https://leetcode.com/problems/delete-node-in-a-linked-list/", hint: "<strong>Pattern:</strong> Copy next node value into current; delete next node." },
    { name: "Swap Nodes in Pairs", diff: "medium", lc: "https://leetcode.com/problems/swap-nodes-in-pairs/", hint: "<strong>Pattern:</strong> Dummy head; swap pairs with prev, first, second pointers." },
    { name: "Flatten a Multilevel Doubly Linked List", diff: "medium", lc: "https://leetcode.com/problems/flatten-a-multilevel-doubly-linked-list/", hint: "<strong>Pattern:</strong> DFS or iterative: flatten child, splice between curr and next." }
  ],
  "bit-manipulation": [
    { name: "Power of Two", diff: "easy", lc: "https://leetcode.com/problems/power-of-two/", hint: "<strong>Pattern:</strong> n > 0 && (n & (n-1)) == 0 — only one set bit." },
    { name: "Power of Four", diff: "easy", lc: "https://leetcode.com/problems/power-of-four/", hint: "<strong>Pattern:</strong> Power of two AND n & 0x55555555 (set bits at even positions)." },
    { name: "Hamming Distance", diff: "easy", lc: "https://leetcode.com/problems/hamming-distance/", hint: "<strong>Pattern:</strong> XOR x^y then count set bits with n & (n-1)." },
    { name: "Sum of Two Integers", diff: "medium", lc: "https://leetcode.com/problems/sum-of-two-integers/", hint: "<strong>Pattern:</strong> Repeat: sum = a^b, carry = (a&b)<<1 until carry is 0." },
    { name: "Single Number II", diff: "medium", lc: "https://leetcode.com/problems/single-number-ii/", hint: "<strong>Pattern:</strong> Count bits mod 3 per position, reconstruct unique number." },
    { name: "Bitwise AND of Numbers Range", diff: "medium", lc: "https://leetcode.com/problems/bitwise-and-of-numbers-range/", hint: "<strong>Pattern:</strong> Shift right until left==right; common prefix of bits." }
  ]
};
