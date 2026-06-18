import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import { PostCard } from "#/components/posts/PostCard";
import { Reveal } from "#/components/ui/reveal";
import { Text } from "#/components/ui/text";
import { ALL_POSTS } from "#/data/Posts";
import { useCountAnimation } from "#/hooks/UseCountAnimation";

const recent = [...ALL_POSTS].sort((a, b) => b.date.localeCompare(a.date)).slice(0, 3);

function PostCount() {
  const { rounded, ref } = useCountAnimation(ALL_POSTS.length);
  return (
    <span className="inline-flex items-baseline gap-0.5 font-mono text-accent self-center">
      <motion.span ref={ref} className="text-[15px] font-semibold tabular-nums">
        {rounded}
      </motion.span>
      <span className="text-[11px] opacity-60">posts</span>
    </span>
  );
}

export function RecentPosts() {
  return (
    <section className="relative py-30 max-[520px]:py-21" id="study">
      <div className="max-w-280 mx-auto px-8 w-full max-[520px]:px-5">
        <Reveal className="flex items-baseline gap-4.5 mb-14">
          <Text variant="caption" color="accent">
            04
          </Text>
          <Text variant="heading4">My Study</Text>
          <PostCount />
          <Text variant="caption" color="subtle" className="ml-auto max-[600px]:hidden">
            {"// 배운 것들을 꾸준히 기록해왔습니다"}
          </Text>
        </Reveal>

        <div className="flex flex-col">
          {recent.map((post, i) => (
            <Reveal key={post.slug} delay={i * 0.05}>
              <PostCard post={post} />
            </Reveal>
          ))}
        </div>
        <div className="border-b border-border" />

        <Reveal className="flex justify-end mt-8">
          <Link
            to="/posts"
            className="font-mono text-[13px] text-text-2 hover:text-accent transition-colors duration-200 flex items-center gap-1.75"
          >
            모든 글 보기 →
          </Link>
        </Reveal>
      </div>
    </section>
  );
}
