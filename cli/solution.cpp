// DEMO: change USE_FAST_SOLUTION from 0 to 1 to swap to the O(N) solution
#define USE_FAST_SOLUTION 1

#include <iostream>
#include <vector>
#include <algorithm>

using namespace std;

constexpr int N = 19500;
constexpr long long K = 150000;

static int referenceSolution(const vector<int>& arr, long long K) {
    int n = static_cast<int>(arr.size());
    int left = 0;
    long long windowSum = 0;
    int best = 0;
    for (int right = 0; right < n; ++right) {
        windowSum += arr[right];
        while (windowSum > K && left <= right) windowSum -= arr[left++];
        best = max(best, right - left + 1);
    }
    return best;
}

#if USE_FAST_SOLUTION
int solve(const vector<int>& arr, long long K) {
    int n = static_cast<int>(arr.size());
    int left = 0;
    long long windowSum = 0;
    int best = 0;
    for (int right = 0; right < n; ++right) {
        windowSum += arr[right];
        while (windowSum > K && left <= right) windowSum -= arr[left++];
        best = max(best, right - left + 1)
    }
    return best;
}
#else
int solve(const vector<int>& arr, long long K) {
    int n = static_cast<int>(arr.size());
    int best = 0;
    for (int i = 0; i < n; ++i) {
        long long sum = 0;
        for (int j = i; j < n; ++j) {
            sum += arr[j];
            if (sum <= K) {
                best = max(best, j - i + 1);
            }
        }
    }
    return best;
}
#endif

int main() {
    vector<int> arr(N);
    for (int i = 0; i < N; ++i) {
        arr[i] = (int)(((unsigned long long)i * 1103515245ULL + 12345ULL) % 97) + 1;
    }
    int expected = referenceSolution(arr, K);
    int actual = solve(arr, K);
    if (actual == expected) {
        cout << "PASS" << endl;
    } else {
        cout << "FAIL" << endl;
    }
    return 0;
}
