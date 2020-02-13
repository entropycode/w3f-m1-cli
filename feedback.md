---
title: "Feedback Pallet"
---

This documents the logic behind the feedback pallet, as it's own crate, that can be used along with other Pallets in substrate.

The code for this pallet can be found [in this repository]().

The feedback pallet facilitate people to create polls with certain options and expiration times. Any time before a poll's expiration time, people choice an option and vote. 

### 1. Setup

If you have not created a custom pallet in it's own crate before, we recommend that you go through the tutorial [here](https://substrate.dev/docs/en/tutorials/creating-a-runtime-module/). 

You should have a directory setup that looks like this 

```
node
|
+-- runtime
    |
    +-- src
        |
        +-- lib.rs
        |

feedback
|
+-- runtime
    |
    +-- src
        |
        +-- lib.rs
```

We will dive right into the feedback pallet. 

### 2. Using Other Pallets

There are many standard pallets that comes in the substrate runtime, we first define what is needed in ours

```
use frame_support::{decl_module, decl_storage, decl_event, dispatch::DispatchResult, dispatch::Vec, StorageValue, StorageMap, ensure};
use system::ensure_signed;
use codec::{Encode, Decode};
use timestamp;
use sp_runtime::traits::{Hash, CheckedAdd};
```

We need the timestamp pallet to calculate the expiration of each poll. 

