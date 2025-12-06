---
date: '2025-12-01T23:03:58Z'
draft: false
title: 'Fixing The Vibes'
author: pre
category:
- news
- exocortexLog
cover:
  alt: Screenshot of me manually editing code, fixing issues
  image: img/2025/editingcode.png
description: Fixing the problems introduced by vibe coding
---

As the project code-base grows, the robot
has more and more trouble making changes.

It becomes more likely to decide to replace 
an entire file with just a comment describing
how the rest of the file should remain unchanged
😆.

Rollback.

It becomes more likely to introduce syntax
errors, which seem to confuse it even more.

When there's an issue with brackets or indentation
becoming mucked up it requires lots of the code 
in a single context in order to spot the problem
and of course context windows are limited in size.

Sometimes it changes functions that don't need
changing and introduces a bug in a system which 
worked before.

It can get into a loop trying to fix a problem, which
introduces another problem, so it undoes the fix to
address the new problem and tries again, apparently
fixing it the same way to reintroduce the problem 
instead.

It started to require lots of credit to read in 
increasingly large amount of the growing code-base,
and failing to fix things and introducing errors
more and more.

So I look at the code myself, finally. And my god it
is a mess.

Duplicates of functions all over the place, different
methods used to create the tabs/pages for different
functions. No common included header, just code pasted
and edited on each.

I spend a whole twelve hour day fixing the thing.

This is a step non-devs would find tricky. I found it
pretty difficult and exhausting myself. Keeping track of
all the new files I was making and where functions were
being moved to be more accessible to the rest of the code
or more modular and enclosed.

I mean this isn't uniquely a robot-written code thing.
It's very easy to just make small patches over and over
and end up with a spaghetti mess that won't fit into
your head as a dev, so it's not surprising that the robot
can also make small patches over and over and end up with
a disorganized spaghetti mess that won't fit into it's
context-window.

Eventually it's cleaned up and organized well enough
that both me and the robot can keep the whole in mind
better and make more correct assumptions about how
everything works as they do so.

The robot is back to being able to edit the code
as smoothly as when it started with a blank template.

ChatGPT 4.1 is definitely quite crap. Way worse than
the default Shakespeare model. It just breaks everything
more likely than fixing things. 

GPT 5.1 is much better, much less likely to just replace
a file with a comment saying to keep it the same.

The Shakespeare default model seems fine though usually.
So long as you're keeping track of the code as well
as the UI, making sure it's not duplicating functions, 
explicitly telling to use existing functions, giving it
directions on how to organize the code as well as the
changes to the UI to make.

