using BEQSAN.Domain.Common;

namespace BEQSAN.Domain.Social;

public static class SocialErrors
{
    public static readonly Error OAuthStateInvalid = Error.Validation(
        "social.oauth.state.invalid",
        "Meta-დან მიღებული `state` პარამეტრი არ ემთხვევა გაშვებულს — ხელახლა დაიწყე ავტორიზაცია.");

    public static readonly Error OAuthCodeMissing = Error.Validation(
        "social.oauth.code.missing",
        "Meta-დან `code` პარამეტრი არ მოვიდა.");

    public static readonly Error AccountNotFound = Error.NotFound(
        "social.account.notFound",
        "მითითებული სოციალური ანგარიში ვერ მოიძებნა.");

    public static readonly Error PageNotFound = Error.NotFound(
        "social.page.notFound",
        "მითითებული გვერდი ვერ მოიძებნა.");

    public static readonly Error TokenExpired = Error.BusinessRule(
        "social.token.expired",
        "Meta-ს ტოკენი ვადაგასულია. გვერდი ხელახლა უნდა დააკავშირო.");

    public static readonly Error CaptionRequired = Error.Validation(
        "social.post.caption.required",
        "პოსტს უნდა ჰქონდეს ტექსტი ან მინიმუმ ერთი სურათი.",
        field: "caption");

    public static readonly Error CaptionTooLong = Error.Validation(
        "social.post.caption.tooLong",
        "ტექსტი 2200 სიმბოლოს არ უნდა აღემატებოდეს.",
        field: "caption");

    public static readonly Error InstagramRequiresImage = Error.Validation(
        "social.post.instagram.imageRequired",
        "Instagram-ის პოსტს მინიმუმ ერთი სურათი სჭირდება.",
        field: "imageUrls");

    public static readonly Error ImageUrlInvalid = Error.Validation(
        "social.post.image.invalid",
        "სურათის URL უნდა იყოს `https://` ფორმატით.",
        field: "imageUrls");

    public static readonly Error MetaApiFailure = Error.Failure(
        "social.meta.api.failure",
        "Meta-ს API-მ შეცდომა დააბრუნა. გადახედე გვერდის შესვლის ცვლილებებს და სცადე ხელახლა.");

    public static readonly Error AiAssistFailure = Error.Failure(
        "social.ai.failure",
        "AI ასისტენტმა ვერ უპასუხა. სცადე ხელახლა რამდენიმე წამში.");

    public static readonly Error ThreadNotFound = Error.NotFound(
        "social.inbox.thread.notFound",
        "მიმოწერა ვერ მოიძებნა.");

    public static readonly Error ReplyEmpty = Error.Validation(
        "social.inbox.reply.empty",
        "პასუხის ტექსტი ცარიელია.",
        field: "text");

    public static readonly Error WebhookVerifyFailed = Error.Unauthorized(
        "social.webhook.verify.failed",
        "Meta webhook verify token არასწორია.");
}
